import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeChunk extends Document {
  workspaceId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  text: string;
  embedding: number[]; // Vector representation
  metadata: Map<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Vector search index would typically be created in Atlas directly, 
// but we keep a standard index on documentId for cascade deletes
knowledgeChunkSchema.index({ documentId: 1 });

export const KnowledgeChunk = mongoose.model<IKnowledgeChunk>('KnowledgeChunk', knowledgeChunkSchema);
