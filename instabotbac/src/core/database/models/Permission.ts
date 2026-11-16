import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, unique: true },
    resource: { type: String, required: true },
    action: { type: String, enum: ['create', 'read', 'update', 'delete', 'manage'], required: true },
    description: { type: String },
  },
  { timestamps: true }
);

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);
