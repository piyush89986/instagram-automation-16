import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  filename: string;
  fileUrl: string;
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'WEBSITE';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  chunkCount: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['PDF', 'DOCX', 'TXT', 'WEBSITE'], required: true },
    status: { 
      type: String, 
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], 
      default: 'PENDING' 
    },
    chunkCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

knowledgeDocumentSchema.index({ workspaceId: 1 });

export const KnowledgeDocument = mongoose.model<IKnowledgeDocument>('KnowledgeDocument', knowledgeDocumentSchema);
