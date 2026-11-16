import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: string; // The IG user ID or the Account ID if sent by us
  text?: string;
  mediaUrl?: string;
  source: 'INSTAGRAM' | 'SYSTEM_AI' | 'SYSTEM_AGENT' | 'AUTOMATION';
  messageType: 'DM' | 'STORY_REPLY' | 'STORY_MENTION';
  metaMessageId?: string; // ID from Meta graph API
  isRead: boolean;
  createdAt: Date;
}

const instagramMessageSchema = new Schema<IInstagramMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'InstagramConversation', required: true },
    senderId: { type: String, required: true },
    text: { type: String },
    mediaUrl: { type: String },
    source: { 
      type: String, 
      enum: ['INSTAGRAM', 'SYSTEM_AI', 'SYSTEM_AGENT', 'AUTOMATION'], 
      required: true 
    },
    messageType: { 
      type: String, 
      enum: ['DM', 'STORY_REPLY', 'STORY_MENTION'], 
      default: 'DM' 
    },
    metaMessageId: { type: String, unique: true, sparse: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

instagramMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const InstagramMessage = mongoose.model<IInstagramMessage>('InstagramMessage', instagramMessageSchema);
