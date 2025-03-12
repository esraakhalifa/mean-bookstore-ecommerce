import {z} from 'zod';

const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId format');

export const AddToCartSchema = z.object({
  bookId: ObjectIdSchema.refine(
    (id) => id.length === 24,
    {message: 'Invalid book ID format'}
  ),
  quantity: z.number().int().positive().default(1)
});

export const UpdateCartItemSchema = z.object({
  bookId: ObjectIdSchema.refine(
    (id) => id.length === 24,
    {message: 'Invalid book ID format'}
  ),
  quantity: z.number().int().min(0)
});
