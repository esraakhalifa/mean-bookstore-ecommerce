import {z} from 'zod'

export const BookSchema = z.object({
  title: z.string().min(1, 'Title is required'),

  authors: z.array(z.string().min(1)).min(1, 'A book must have at least 1 author'),

  price: z.number().min(1, 'Price cannot be zero.'),

  description: z.string().min(1, 'Description is required'),

  stock: z.number().int().min(0, 'Stock must be a non-negative integer').default(0),

  reviews: z.array(z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid Review ID')).optional(),

  img: z.string(),
  // .url('Invalid image URL')
})
export type Book = z.infer<typeof BookSchema>
