import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from './products.controller';
import { protect } from '../../core/middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .put(updateProduct)
  .delete(deleteProduct);

export default router;
