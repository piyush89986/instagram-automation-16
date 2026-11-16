import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramConversation extends Document {
  workspaceId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  assignedAgent?: mongoose.Types.ObjectId;
  humanTakeover: boolean;
  status: 'OPEN' | 'RESOLVED' | 'SNOOZED';
  lastMessageAt: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const instagramConversationSchema = new Schema<IInstagramConversation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    assignedAgent: { type: Schema.Types.ObjectId, ref: 'User' },
    humanTakeover: { type: Boolean, default: false },
    status: { 
      type: String, 
      enum: ['OPEN', 'RESOLVED', 'SNOOZED'], 
      default: 'OPEN' 
    },
    lastMessageAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A contact can only have one active conversation per Instagram account
instagramConversationSchema.index({ instagramAccountId: 1, contactId: 1 }, { unique: true });
instagramConversationSchema.index({ workspaceId: 1, status: 1 });

export const InstagramConversation = mongoose.model<IInstagramConversation>('InstagramConversation', instagramConversationSchema);
