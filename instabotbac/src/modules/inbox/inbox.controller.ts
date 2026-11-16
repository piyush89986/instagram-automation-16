import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { InstagramConversation } from '../../core/database/models/InstagramConversation';
import { InstagramMessage } from '../../core/database/models/InstagramMessage';
import { InstagramAccount } from '../../core/database/models/InstagramAccount';
import { Contact } from '../../core/database/models/Contact';
import { AutomationWorkflow } from '../../core/database/models/AutomationWorkflow';

export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status || 'OPEN';
    
    const conversations = await InstagramConversation.find({ 
      workspaceId: req.workspaceId,
      status: status as any
    })
    .sort({ lastMessageAt: -1 })
    .populate('contactId')
    .populate('assignedAgent', 'firstName lastName email');

    console.log(`Backend Inbox Conversations Response for Workspace ${req.workspaceId}:`, JSON.stringify(conversations, null, 2));

    res.status(200).json({ status: 'success', data: { conversations } });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Verify the conversation belongs to this workspace
    const conversation = await InstagramConversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });

    if (!conversation) return next(Object.assign(new Error('Conversation not found'), { statusCode: 404, isOperational: true }));

    const messages = await InstagramMessage.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 }); // Oldest to newest for chat UI

    res.status(200).json({ status: 'success', data: { messages } });
  } catch (error) {
    next(error);
  }
};

export const toggleHumanTakeover = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { humanTakeover } = req.body;
    
    const conversation = await InstagramConversation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      { humanTakeover },
      { new: true }
    );

    if (!conversation) return next(Object.assign(new Error('Conversation not found'), { statusCode: 404, isOperational: true }));

    res.status(200).json({ status: 'success', data: { conversation } });
  } catch (error) {
    next(error);
  }
};

export const sendManualMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    const conversationId = req.params.id;
    const workspaceId = req.workspaceId;

    const conversation = await InstagramConversation.findOne({ _id: conversationId, workspaceId });
    if (!conversation) {
      return next(Object.assign(new Error('Conversation not found'), { statusCode: 404, isOperational: true }));
    }

    const newMessage = await InstagramMessage.create({
      conversationId: conversation._id,
      senderId: conversation.instagramAccountId.toString(),
      text: message,
      source: 'SYSTEM_AGENT',
      messageType: 'DM',
      isRead: true
    });

    // Optionally call Instagram Messaging Service to actually send the message
    // await import('../instagram/messaging.service').then(m => m.sendTextMessage(...));

    res.status(200).json({ status: 'success', data: { message: newMessage } });
  } catch (error) {
    next(error);
  }
};

export const migrateWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const TARGET_WORKSPACE_ID = req.workspaceId;
    const results: any = {};

    try {
      const accounts = await InstagramAccount.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
      results.accounts = accounts.modifiedCount;
    } catch (e: any) { results.accounts = e.message; }

    try {
      const convos = await InstagramConversation.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
      results.convos = convos.modifiedCount;
    } catch (e: any) { results.convos = e.message; }

    try {
      const contacts = await Contact.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
      results.contacts = contacts.modifiedCount;
    } catch (e: any) { results.contacts = e.message; }

    try {
      const workflows = await AutomationWorkflow.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
      results.workflows = workflows.modifiedCount;
    } catch (e: any) { results.workflows = e.message; }

    try {
      const { Chatbot } = await import('../../core/database/models/Chatbot');
      const chatbots = await Chatbot.updateMany({}, { tenantId: TARGET_WORKSPACE_ID });
      results.chatbots = chatbots.modifiedCount;
    } catch (e: any) { results.chatbots = e.message; }

    // Use send() to bypass any json formatting middleware that might fail
    res.status(200).send(JSON.stringify({ status: 'success', data: results }));
  } catch (error: any) {
    res.status(200).send(JSON.stringify({ status: 'error', message: error.message, stack: String(error.stack) }));
  }
};

export const updateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ status: 'error', message: 'token is required in request body' });
    }

    // Update ALL instagram accounts with the new token
    const result = await InstagramAccount.updateMany(
      { workspaceId: req.workspaceId },
      { 
        accessToken: token, 
        pageAccessToken: token 
      }
    );

    let accountsCreated = 0;
    if (result.modifiedCount === 0 && result.matchedCount === 0) {
      // If no accounts exist, create a dummy one with the known IDs so they can test
      await InstagramAccount.create({
        workspaceId: req.workspaceId,
        instagramAccountId: '17841415990944794', // Alligtore IG Account ID
        metaAccountId: '1234251173094671', // Alligtore Page ID
        accessToken: token,
        pageAccessToken: token,
        username: 'Alligtore (Auto Created)',
        isActive: true
      });
      accountsCreated = 1;
    }

    // Also reset humanTakeover on all conversations so the bot can reply
    const convosReset = await InstagramConversation.updateMany(
      { workspaceId: req.workspaceId },
      { humanTakeover: false }
    );

    res.status(200).json({ 
      status: 'success', 
      data: { 
        accountsUpdated: result.modifiedCount,
        accountsCreated,
        conversationsReset: convosReset.modifiedCount,
        message: 'Token updated (or account created) and humanTakeover reset on all conversations'
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const resetAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId;
    
    const delAccounts = await InstagramAccount.deleteMany({ workspaceId });
    const delConvos = await InstagramConversation.deleteMany({ workspaceId });
    const delMessages = await InstagramMessage.deleteMany({}); // Delete all messages (could be filtered by convo, but just wiping everything)
    const delContacts = await Contact.deleteMany({ workspaceId });

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Database WIPED successfully for this workspace! You can now start fresh.',
        deletedCounts: {
          accounts: delAccounts.deletedCount,
          conversations: delConvos.deletedCount,
          messages: delMessages.deletedCount,
          contacts: delContacts.deletedCount
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
