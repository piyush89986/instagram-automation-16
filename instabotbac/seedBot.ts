import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Workspace } from './src/core/database/models/Workspace';
import { AutomationWorkflow } from './src/core/database/models/AutomationWorkflow';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');

    const workspaces = await Workspace.find();
    console.log(`Found ${workspaces.length} workspaces to update.`);

    const kb = `You are a friendly, enthusiastic, and expert sales assistant for "Tomar's Trail Bikes", a premium bicycle shop. 
We specialize in Mountain Bikes, Road Bikes, and E-Bikes. 
Pricing: 
- Mountain Bikes: start at $800
- Road Bikes: start at $1200
- E-Bikes: start at $2000
Store Hours: Mon-Fri 9AM-6PM, Sat 10AM-4PM, Closed Sundays.
Location: 123 Main St, Denver, Colorado.

Always keep responses under 2-3 sentences. Be highly engaging. Use emojis. If someone asks for a specific bike, ask them what kind of riding they plan to do first!`;

    for (const ws of workspaces) {
      await Workspace.findByIdAndUpdate(ws._id, { aiKnowledgeBase: kb });
      
      await AutomationWorkflow.findOneAndUpdate(
        { workspaceId: ws._id, triggerType: 'DM_RECEIVED' },
        {
          name: 'Default AI Responder',
          isActive: true,
          nodesGraph: [
            { type: 'trigger', id: 'node-1' },
            { 
              type: 'ai_response', 
              id: 'node-2', 
              data: { 
                provider: 'OPENAI', 
                prompt: 'You are the primary AI sales assistant. Always use the provided GLOBAL KNOWLEDGE BASE to answer questions.' 
              } 
            }
          ],
          edgesGraph: [
            { source: 'node-1', target: 'node-2' }
          ]
        },
        { upsert: true, new: true }
      );
      
      await AutomationWorkflow.findOneAndUpdate(
        { workspaceId: ws._id, triggerType: 'COMMENT_CREATED' },
        {
          name: 'Default Comment Auto-Reply',
          isActive: true,
          nodesGraph: [
            { type: 'trigger', id: 'node-1' },
            { 
              type: 'send_message', 
              id: 'node-2', 
              data: { 
                publicReply: 'Thanks for your comment! I just sent you a DM with more info 🚲',
                text: 'Hey! Saw your comment on our post. How can I help you today? Check out our bikes at Tomar\'s Trail Bikes!'
              } 
            }
          ],
          edgesGraph: [
            { source: 'node-1', target: 'node-2' }
          ]
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded workspace ${ws._id}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
