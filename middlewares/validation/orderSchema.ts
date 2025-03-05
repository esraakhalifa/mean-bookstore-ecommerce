import {z} from 'zod'

export const OrderSchema = z.object({

  user: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid User ID'),

  books: z.array(z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid Book ID'))
    .min(1, 'User should at least order 1 book.'),

  total_price: z.number().min(1, 'Price cannot be zero.'),

  payment_method: z.enum(['card', 'cash', 'online wallet']),

})
export type Order = z.infer<typeof OrderSchema>
