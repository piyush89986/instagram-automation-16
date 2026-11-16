import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  workspaceId?: mongoose.Types.ObjectId; 
  name: string; 
  permissions: mongoose.Types.ObjectId[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace' },
    name: { type: String, required: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Role = mongoose.model<IRole>('Role', roleSchema);
