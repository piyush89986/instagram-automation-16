import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  workspaceId: mongoose.Types.ObjectId;
  instagramUserId: string; // The PSID / IGSID from Meta
  username: string;
  name?: string;
  phone?: string;
  email?: string;
  profilePicUrl?: string;
  leadScore: number;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CUSTOMER' | 'CHURNED';
  tags: mongoose.Types.ObjectId[];
  customFields: Map<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramUserId: { type: String, required: true },
    username: { type: String, required: true },
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    profilePicUrl: { type: String },
    leadScore: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CUSTOMER', 'CHURNED'], 
      default: 'NEW' 
    },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    customFields: { type: Map, of: Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

contactSchema.index({ workspaceId: 1, instagramUserId: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
