import { Job } from 'bullmq';
import { createWorker } from '../../../config/queue';
import { AutomationWorkflow } from '../../../core/database/models/AutomationWorkflow';
import { Chatbot } from '../../../core/database/models/Chatbot';
import { Workspace } from '../../../core/database/models/Workspace';
import { sendTextMessage, replyToComment } from '../../instagram/messaging.service';

export const commentWorker = createWorker('commentQueue', async (job: Job) => {
  const { workspaceId, igAccountId, senderId, commentId, commentText } = job.data;

  try {
    const workflows = await AutomationWorkflow.find({
      workspaceId,
      triggerType: 'COMMENT_CREATED',
      isActive: true
    });

    let workflowHandled = false;

    for (const workflow of workflows) {
      const rootNode = workflow.nodesGraph.find((n: any) => n.type === 'trigger');
      const actionNode = workflow.nodesGraph.find((n: any) => n.type === 'send_message');

      // Basic matching logic: check if comment contains the trigger keyword (simplified)
      // In a real app, this parses workflow.triggerConfig
      if (actionNode && actionNode.data) {
        
        // 1. Reply to Comment Publicly (if configured)
        if (actionNode.data.publicReply) {
          await replyToComment(igAccountId, commentId, actionNode.data.publicReply);
        }
        
        // 2. Send Private DM
        if (actionNode.data.text) {
          await sendTextMessage(igAccountId, senderId, actionNode.data.text);
        }
        
        workflowHandled = true;
        break; 
      }
    }

    // AI Fallback if no specific automation workflow handled the comment
    if (!workflowHandled) {
      const chatbots = await Chatbot.find({
        tenantId: workspaceId,
        channel: 'instagram',
        status: 'active'
      });

      if (chatbots.length > 0) {
        console.log(`🤖 AI handling Instagram comment...`);
        const { AIFactory } = await import('../../../core/ai/AIFactory');
        const provider = AIFactory.getProvider('OPENAI');
        
        let systemPrompt = 'You are a helpful social media manager for the brand. Keep your replies to Instagram comments VERY short, friendly, and engaging (1-2 sentences max). Use emojis. If they ask about a product or price, answer briefly based on the knowledge base.';
        
        const workspaceData = await Workspace.findById(workspaceId);
        if (workspaceData && workspaceData.aiKnowledgeBase) {
          systemPrompt = `${systemPrompt}\n\n=== BRAND KNOWLEDGE BASE ===\n${workspaceData.aiKnowledgeBase}`;
        }
        
        const aiMessages: any[] = [{ role: 'user', content: `Someone commented on our Instagram post: "${commentText}". Please generate a short, friendly reply to this comment.` }];

        try {
          const replyText = await provider.generateReply(aiMessages, systemPrompt);
          console.log(`🤖 AI generated comment reply successfully:`, replyText);
          
          if (replyText) {
            const cleanReply = replyText.replace(/ \[HIDDEN_CONTEXT:.*?\]/g, '').trim();
            await replyToComment(igAccountId, commentId, cleanReply);
            console.log(`✅ Auto-replied to comment ${commentId}`);
          }
        } catch (e) {
          console.error('AI Comment Generation Failed:', e);
        }
      }
    }
  } catch (error: any) {
    console.error('Comment Worker failed:', error.message);
    throw error;
  }
});
