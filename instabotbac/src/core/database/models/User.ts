import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
  workspaceId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  isEmailVerified: boolean;
  isActive: boolean;
  refreshToken?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ workspaceId: 1 });
userSchema.index({ deletedAt: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
