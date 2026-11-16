import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramPost extends Document {
  workspaceId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  postType: 'IMAGE' | 'CAROUSEL' | 'REEL' | 'STORY';
  mediaUrls: string[];
  caption?: string;
  scheduledTime?: Date;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  metaMediaId?: string; // ID returned by Meta after successful publish
  errorLogs?: string[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const instagramPostSchema = new Schema<IInstagramPost>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', required: true },
    postType: { type: String, enum: ['IMAGE', 'CAROUSEL', 'REEL', 'STORY'], required: true },
    mediaUrls: [{ type: String, required: true }],
    caption: { type: String },
    scheduledTime: { type: Date },
    status: { 
      type: String, 
      enum: ['DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'], 
      default: 'DRAFT' 
    },
    metaMediaId: { type: String },
    errorLogs: [{ type: String }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

instagramPostSchema.index({ workspaceId: 1, status: 1 });
instagramPostSchema.index({ scheduledTime: 1 }, { partialFilterExpression: { status: 'SCHEDULED' } });

export const InstagramPost = mongoose.model<IInstagramPost>('InstagramPost', instagramPostSchema);
