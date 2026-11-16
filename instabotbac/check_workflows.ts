import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const AutomationWorkflowSchema = new mongoose.Schema({
  workspaceId: mongoose.Schema.Types.ObjectId,
  name: String,
  triggerType: String,
  isActive: Boolean,
  nodesGraph: mongoose.Schema.Types.Mixed
}, { collection: 'automationworkflows' }); // Check exact collection name if it doesn't match

const Workflow = mongoose.model('Workflow', AutomationWorkflowSchema);

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');
    const workflows = await Workflow.find({});
    console.log(`Found ${workflows.length} total workflows.`);
    
    workflows.forEach(w => {
      console.log(`\n- Name: ${w.name}`);
      console.log(`  isActive: ${w.isActive}`);
      console.log(`  triggerType: ${w.triggerType}`);
      console.log(`  Workspace: ${w.workspaceId}`);
      if (w.nodesGraph) {
        console.log(`  Nodes: ${JSON.stringify(w.nodesGraph).substring(0, 200)}...`);
      }
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
