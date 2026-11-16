import mongoose, { Document, Schema } from 'mongoose';

export interface IChatbot extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  knowledgeBaseId: string | null;
  channel: 'whatsapp' | 'instagram' | 'web';
  channelConfig: Record<string, any>;
  status: 'active' | 'paused';
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const chatbotSchema = new Schema<IChatbot>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    knowledgeBaseId: { type: String, default: null },
    channel: { type: String, enum: ['whatsapp', 'instagram', 'web'], required: true },
    channelConfig: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    config: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Chatbot = mongoose.model<IChatbot>('Chatbot', chatbotSchema);
