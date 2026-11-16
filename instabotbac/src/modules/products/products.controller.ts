import { Request, Response, NextFunction } from 'express';
import { Product } from '../../core/database/models/Product';
import { AuthRequest } from '../../core/middlewares/authMiddleware';

export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find({ workspaceId: req.workspaceId });
    res.status(200).json({ status: 'success', data: { products } });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = new Product({
      ...req.body,
      workspaceId: req.workspaceId
    });
    await product.save();
    res.status(201).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });
    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
