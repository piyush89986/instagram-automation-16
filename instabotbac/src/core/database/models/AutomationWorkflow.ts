import mongoose, { Document, Schema } from 'mongoose';

export interface IAutomationWorkflow extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  triggerType: 'DM_RECEIVED' | 'COMMENT_CREATED' | 'STORY_REPLY' | 'STORY_MENTION' | 'KEYWORD_DETECTED' | 'NEW_LEAD';
  triggerConfig?: any; // e.g. Keywords to match
  nodesGraph: any; // JSON representation of visual nodes
  edgesGraph: any; // JSON representation of visual edges
  isActive: boolean;
  publishedVersion: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const automationWorkflowSchema = new Schema<IAutomationWorkflow>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    triggerType: { 
      type: String, 
      enum: ['DM_RECEIVED', 'COMMENT_CREATED', 'STORY_REPLY', 'STORY_MENTION', 'KEYWORD_DETECTED', 'NEW_LEAD'], 
      required: true 
    },
    triggerConfig: { type: Schema.Types.Mixed },
    nodesGraph: { type: Schema.Types.Mixed, default: [] },
    edgesGraph: { type: Schema.Types.Mixed, default: [] },
    isActive: { type: Boolean, default: false },
    publishedVersion: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

automationWorkflowSchema.index({ workspaceId: 1, triggerType: 1 });

export const AutomationWorkflow = mongoose.model<IAutomationWorkflow>('AutomationWorkflow', automationWorkflowSchema);
