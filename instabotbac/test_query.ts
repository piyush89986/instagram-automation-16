import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AutomationWorkflow } from './src/core/database/models/AutomationWorkflow';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');

    const workspaceIdStr = "6a3e544cd9733648240ca4ff";
    console.log('Querying with string:', workspaceIdStr);
    let workflows = await AutomationWorkflow.find({
      workspaceId: workspaceIdStr,
      triggerType: 'DM_RECEIVED',
      isActive: true
    });
    console.log('Results string:', workflows.length);

    console.log('Querying with ObjectId...');
    workflows = await AutomationWorkflow.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceIdStr),
      triggerType: 'DM_RECEIVED',
      isActive: true
    });
    console.log('Results ObjectId:', workflows.length);

    // Let's dump the raw record
    const all = await AutomationWorkflow.find({ workspaceId: workspaceIdStr });
    if (all.length > 0) {
      console.log('Raw doc isActive:', all[0].isActive, typeof all[0].isActive);
      console.log('Raw doc triggerType:', all[0].triggerType);
      console.log('Raw doc deletedAt:', all[0].deletedAt);
    }
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
