import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  workspaceId: mongoose.Types.ObjectId;
  date: Date;
  messagesSent: number;
  messagesReceived: number;
  aiResponses: number;
  humanResponses: number;
  leadsGenerated: number;
  storyAutomationsTriggered: number;
  commentAutomationsTriggered: number;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    date: { type: Date, required: true }, // Store at day level
    messagesSent: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    aiResponses: { type: Number, default: 0 },
    humanResponses: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    storyAutomationsTriggered: { type: Number, default: 0 },
    commentAutomationsTriggered: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// We aggregate by day per workspace
analyticsSchema.index({ workspaceId: 1, date: 1 }, { unique: true });

export const Analytics = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
