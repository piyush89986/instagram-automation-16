import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  aiKnowledgeBase: string;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionTier: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    },
    aiKnowledgeBase: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ deletedAt: 1 });

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema);
