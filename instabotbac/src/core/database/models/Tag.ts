import mongoose, { Document, Schema } from 'mongoose';

export interface ITag extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  colorHex?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    colorHex: { type: String, default: '#8b5cf6' }, // default purple
  },
  { timestamps: true }
);

tagSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Tag = mongoose.model<ITag>('Tag', tagSchema);
