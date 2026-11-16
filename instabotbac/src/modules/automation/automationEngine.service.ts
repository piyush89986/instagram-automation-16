import { InstagramAccount } from '../../core/database/models/InstagramAccount';
import { Contact } from '../../core/database/models/Contact';
import { InstagramConversation } from '../../core/database/models/InstagramConversation';
import { InstagramMessage } from '../../core/database/models/InstagramMessage';
import { AutomationWorkflow } from '../../core/database/models/AutomationWorkflow';
import { Chatbot } from '../../core/database/models/Chatbot';
import { Workspace } from '../../core/database/models/Workspace';
import { sendTextMessage } from '../instagram/messaging.service';
import { getIO } from '../../config/socket';
import redisConnection from '../../config/redis';
import axios from 'axios';

export const processWebhookEvent = async (event: any) => {
  console.log('🔔 WEBHOOK RECEIVED FROM META:', JSON.stringify(event, null, 2));
  
  const igAccountId = event.id; // Receiver's IG Account ID (our customer)
  const time = event.time;
  
  if (!event.messaging && !event.changes) {
    console.log('⚠️ Webhook has no messaging or changes array. Ignoring.');
    return;
  }

  const account = await InstagramAccount.findOne({
    $or: [
      { instagramAccountId: igAccountId },
      { metaAccountId: igAccountId }
    ]
  });
  if (!account) {
    console.warn(`⚠️ No InstagramAccount found matching receiver ID ${igAccountId}. Active accounts in DB may use different ID.`);
    return;
  }

  for (const messageEvent of (event.messaging || [])) {
    const senderId = messageEvent.sender.id; // IG User sending the DM
    
    // Ignore echos
    if (senderId === igAccountId) continue;

    const messageText = messageEvent.message?.text;
    if (!messageText) continue;

    // Deduplicate: Check if message with this mid already exists
    if (messageEvent.message.mid) {
      if (redisConnection && redisConnection.status === 'ready') {
        try {
          const lockKey = `webhook:lock:mid:${messageEvent.message.mid}`;
          const isNew = await redisConnection.setnx(lockKey, '1');
          if (isNew === 0) {
            console.log('⚠️ Duplicate webhook ignored via Redis lock for mid:', messageEvent.message.mid);
            continue;
          }
          await redisConnection.expire(lockKey, 3600); // 1 hr expiry
        } catch {
          // Redis offline, proceed to MongoDB check
        }
      }

      const existingMsg = await InstagramMessage.findOne({ metaMessageId: messageEvent.message.mid });
      if (existingMsg) {
        console.log('⚠️ Duplicate webhook ignored for mid:', messageEvent.message.mid);
        continue;
      }
    }

    // Determine Message Type (DM vs Story Reply/Mention)
    let messageType: 'DM' | 'STORY_REPLY' | 'STORY_MENTION' = 'DM';
    let triggerType = 'DM_RECEIVED';

    if (messageEvent.message?.reply_to?.story) {
      messageType = 'STORY_REPLY';
      triggerType = 'STORY_REPLY';
    } else if (messageEvent.message?.attachments?.[0]?.type === 'story_mention') {
      messageType = 'STORY_MENTION';
      triggerType = 'STORY_MENTION';
    }

    // Fetch user profile from Meta if possible
    let fetchedUsername = `ig_user_${senderId}`;
    let fetchedName = '';
    let fetchedProfilePic = '';
    try {
      const token = account.pageAccessToken || account.accessToken;
      if (token) {
        // According to Meta Docs, we query graph.facebook.com/{igsid} with the page access token
        const { data: profile } = await axios.get(`https://graph.facebook.com/v21.0/${senderId}?fields=name,profile_pic,username&access_token=${token}`);
        if (profile.username) fetchedUsername = profile.username;
        if (profile.name) fetchedName = profile.name;
        if (profile.profile_pic) fetchedProfilePic = profile.profile_pic;
      }
    } catch (e: any) {
      console.log(`⚠️ Could not fetch profile for IGSID ${senderId}:`, e.response?.data || e.message);
    }

    // 1. Sync CRM Contact
    const updatePayload: any = { updatedAt: new Date() };
    const setOnInsertPayload: any = {};

    if (fetchedUsername && fetchedUsername !== `ig_user_${senderId}`) {
      updatePayload.username = fetchedUsername;
    } else {
      setOnInsertPayload.username = `ig_user_${senderId}`;
    }

    if (fetchedName) {
      updatePayload.name = fetchedName;
    }

    if (fetchedProfilePic) {
      updatePayload.profilePicUrl = fetchedProfilePic;
    }

    const updateQuery: any = { $set: updatePayload };
    if (Object.keys(setOnInsertPayload).length > 0) {
      updateQuery.$setOnInsert = setOnInsertPayload;
    }

    const contact = await Contact.findOneAndUpdate(
      { workspaceId: account.workspaceId, instagramUserId: senderId },
      updateQuery,
      { upsert: true, new: true }
    );


    // 2. Sync Conversation
    const conversation = await InstagramConversation.findOneAndUpdate(
      { workspaceId: account.workspaceId, instagramAccountId: account._id, contactId: contact._id },
      { $set: { lastMessageAt: new Date(), status: 'OPEN' } },
      { upsert: true, new: true }
    );

    // 3. Save Message
    let message;
    try {
      message = await InstagramMessage.create({
        conversationId: conversation._id,
        senderId,
        text: messageText,
        source: 'INSTAGRAM',
        messageType,
        metaMessageId: messageEvent.message.mid
      });
    } catch (err: any) {
      if (err.code === 11000) {
        console.log('⚠️ Duplicate webhook caught by MongoDB unique index for mid:', messageEvent.message.mid);
        continue; // gracefully ignore
      }
      throw err;
    }

    // 4. Real-time broadcast to Live Inbox (Socket.IO)
    try {
      getIO().to(account.workspaceId.toString()).emit('new_message', { conversation, message, contact });
    } catch (e) {
      console.error('Socket broadcast failed:', e);
    }

    // 5. Automation Rule Processing
    if (conversation.humanTakeover) return; // Stop if human is chatting

    // Fetch active workflows for this specific trigger
    console.log('🤖 Debug: Querying workflows with:', {
      workspaceId: account.workspaceId,
      workspaceIdType: typeof account.workspaceId,
      triggerType,
      isActive: true
    });
    
    const workflows = await AutomationWorkflow.find({
      $or: [
        { workspaceId: account.workspaceId },
        { workspaceId: account.workspaceId.toString() }
      ],
      triggerType: triggerType as any,
      isActive: true
    });

    console.log(`🤖 Found ${workflows.length} active workflows for trigger ${triggerType}`);

    let replyText = null;
    let aiNodeFound = false;

    if (workflows.length > 0) {
      for (const workflow of workflows) {
        console.log(`🤖 Executing workflow: ${workflow.name}`);
        const rootNode = workflow.nodesGraph.find((n: any) => n.type === 'trigger');
        
        // Look for action nodes (static text or AI)
        const textActionNode = workflow.nodesGraph.find((n: any) => n.type === 'send_message');
        const aiActionNode = workflow.nodesGraph.find((n: any) => n.type === 'ai_response');

        if (textActionNode && textActionNode.data?.text) {
          replyText = textActionNode.data.text;
          console.log(`🤖 Static reply text found`);
        } 
        else if (aiActionNode) {
          console.log(`🤖 AI Node found, generating reply...`);
          aiNodeFound = true;
          // AI Generation handled below to share code with Chatbot model
        }

        if (replyText || aiNodeFound) break; // Only process one workflow
      }
    } else if (triggerType === 'DM_RECEIVED') {
      // Fallback: Check if they created a Chatbot via the new frontend UI
      const chatbots = await Chatbot.find({
        tenantId: account.workspaceId,
        channel: 'instagram',
        status: 'active'
      });
      
      if (chatbots.length > 0) {
        console.log(`🤖 Found active Chatbot for Instagram`);
        aiNodeFound = true;
      }
    }

    if (aiNodeFound) {
        console.log(`🤖 AI Generation started...`);
        const { AIFactory } = await import('../../core/ai/AIFactory');
        const provider = AIFactory.getProvider('OPENAI');
        let systemPrompt = 'You are a helpful assistant.';
        
        // Fetch global knowledge base
        const workspaceData = await Workspace.findById(account.workspaceId);
        if (workspaceData && workspaceData.aiKnowledgeBase) {
          systemPrompt = `${systemPrompt}\n\n=== GLOBAL KNOWLEDGE BASE ===\n${workspaceData.aiKnowledgeBase}`;
        }
        
        systemPrompt = `${systemPrompt}\n\nCRITICAL INSTRUCTION: If the user asks about a specific product (e.g. "Do you have R15?" or "Show me SP Shine"), you MUST call the \`search_products\` tool! Do NOT just reply with text. The tool is required to show the user the visual product card with images and buttons.`;
        
        // Fetch last 10 messages for context
        const history = await InstagramMessage.find({ conversationId: conversation._id })
          .sort({ createdAt: 1 })
          .limit(10);

        const aiMessages = history.map(h => ({
          role: h.source === 'INSTAGRAM' ? 'user' : 'assistant',
          content: h.text || ''
        })) as any[];

        // Add the current message
        aiMessages.push({ role: 'user', content: messageText });

        try {
          replyText = await provider.generateReply(aiMessages, systemPrompt, undefined, { 
            contactId: contact._id.toString(),
            workspaceId: account.workspaceId.toString(),
            igAccountId: igAccountId,
            senderId: senderId
          });
          console.log(`🤖 AI generated reply successfully`);
        } catch (e) {
          console.error('AI Generation Failed:', e);
          replyText = 'Sorry, I am having trouble connecting to my AI brain right now.';
        }
    }

    if (replyText) {
      console.log(`🤖 Sending reply via messaging service...`);
      try {
        // Strip out hidden context tags before sending to Meta
        const textToMeta = replyText.replace(/ \[HIDDEN_CONTEXT:.*?\]/g, '').trim();
        if (textToMeta) {
          await sendTextMessage(account.instagramAccountId || igAccountId, senderId, textToMeta);
          console.log(`🤖 Text message sent successfully to Meta`);
        }
        
        // Only save to database if Meta successfully delivered it (save the full replyText including hidden context)
        await InstagramMessage.create({
          conversationId: conversation._id,
          senderId: account.metaAccountId,
          text: replyText,
          source: aiNodeFound ? 'SYSTEM_AI' : 'AUTOMATION',
          messageType: 'DM',
        });
      } catch (err: any) {
        console.error(`🤖 Meta Message Send Failed:`, err.response?.data || err.message);
      }
    }
  }

  // Handle Comments / Mentions via `changes` array
  if (event.changes) {
    const { commentQueue } = await import('../../config/queue');
    for (const change of event.changes) {
      if (change.field === 'comments') {
        const commentId = change.value.id;
        const commentText = change.value.text;
        const senderId = change.value.from?.id;

        if (senderId && senderId !== igAccountId) {
          // Push to BullMQ for rate-limited processing
          await commentQueue.add('process-comment', {
            workspaceId: account.workspaceId,
            igAccountId,
            senderId,
            commentId,
            commentText
          });
        }
      }
    }
  }
};
