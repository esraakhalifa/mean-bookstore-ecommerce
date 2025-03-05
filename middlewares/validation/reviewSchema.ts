import {z} from 'zod'

export const ReviewSchema = z.object({
  book: z.string().regex(/^[a-f0-9]{24}$/i),
  user: z.string().regex(/^[a-f0-9]{24}$/i),
  comment: z.string().max(500).optional(),
  rating: z.number().min(1).max(5),
})

export type Review = z.infer<typeof ReviewSchema>
