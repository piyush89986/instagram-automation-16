import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramAccount extends Document {
  workspaceId: mongoose.Types.ObjectId;
  metaAccountId: string;
  instagramAccountId: string;
  username: string;
  profilePicUrl?: string;
  accessToken: string;
  pageAccessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const instagramAccountSchema = new Schema<IInstagramAccount>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    metaAccountId: { type: String, required: true },
    instagramAccountId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    profilePicUrl: { type: String },
    accessToken: { type: String, required: true }, // User access token
    pageAccessToken: { type: String }, // Required for sending messages
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

instagramAccountSchema.index({ workspaceId: 1 });
instagramAccountSchema.index({ deletedAt: 1 });

export const InstagramAccount = mongoose.model<IInstagramAccount>('InstagramAccount', instagramAccountSchema);
