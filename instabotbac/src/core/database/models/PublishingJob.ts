import mongoose, { Document, Schema } from 'mongoose';

export interface IPublishingJob extends Document {
  workspaceId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  bullMqJobId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  errorLog?: string;
  createdAt: Date;
  updatedAt: Date;
}

const publishingJobSchema = new Schema<IPublishingJob>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'InstagramPost', required: true },
    bullMqJobId: { type: String },
    status: { 
      type: String, 
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'], 
      default: 'QUEUED' 
    },
    attempts: { type: Number, default: 0 },
    errorLog: { type: String },
  },
  { timestamps: true }
);

publishingJobSchema.index({ workspaceId: 1, status: 1 });

export const PublishingJob = mongoose.model<IPublishingJob>('PublishingJob', publishingJobSchema);
