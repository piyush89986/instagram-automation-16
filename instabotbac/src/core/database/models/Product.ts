import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  linkUrl?: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    linkUrl: { type: String },
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.index({ workspaceId: 1, name: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
