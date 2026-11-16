import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db';
import { InstagramAccount } from '../core/database/models/InstagramAccount';
import { InstagramConversation } from '../core/database/models/InstagramConversation';
import { Contact } from '../core/database/models/Contact';
import { AutomationWorkflow } from '../core/database/models/AutomationWorkflow';

const TARGET_WORKSPACE_ID = '66882299ff44aa55bb66cc77';

async function run() {
  await connectDB();
  console.log('Migrating data to workspace', TARGET_WORKSPACE_ID);
  
  const accounts = await InstagramAccount.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
  console.log('Accounts updated:', accounts.modifiedCount);
  
  const convos = await InstagramConversation.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
  console.log('Conversations updated:', convos.modifiedCount);
  
  const contacts = await Contact.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
  console.log('Contacts updated:', contacts.modifiedCount);
  
  const workflows = await AutomationWorkflow.updateMany({}, { workspaceId: TARGET_WORKSPACE_ID });
  console.log('Workflows updated:', workflows.modifiedCount);
  
  console.log('Migration complete!');
  process.exit(0);
}
run().catch(console.error);
