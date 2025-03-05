import {z} from 'zod'

const EmailSchema = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const PasswordSchema = /^(?=.*[A-Z])(?=.*\d)[A-Z\d@$!%*?&]{8,}$/i

export const ObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId format')

const CartSchema = z.object({
  books: z.array(ObjectIdSchema).default([]),
  totalAmount: z.number().min(1, 'Total amount must be at least 1').default(0),
})
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  Governorate: z.string(), // later make it an enum
  country: z.string(),
  postalCode: z.string(),
})
const EgyptianMobileSchema = /^(\+20|0)1[0-25]\d{8}$/

const PhoneNumberSchema = z.string().regex(EgyptianMobileSchema)

const CardNumberSchema = /^(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|3(?:0[0-5]|[68]\d)\d{11}|6(?:011|5\d{2})\d{12}|(?:2131|1800|35\d{3})\d{11})$/

const PaymentCardSchema = z.string().regex(CardNumberSchema)
export const UserSchema = z.object({

  firstName: z.string().min(1, 'First name is required').regex(/^[a-z]+$/i, 'Only letters allowed'),
  lastName: z.string().min(1, 'Last name is required').regex(/^[a-z]+$/i, 'Only letters allowed'),

  userName: z.string().min(1, 'Username is required'),

  email: z.string().min(1, 'Email is required').regex(EmailSchema, 'Invalid email format'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(PasswordSchema, 'Password must contain at least one letter and one number'),

  isVerified: z.boolean().default(false),

  role: z.enum(['customer', 'admin']),
  cart: CartSchema,
  profile: z.array(AddressSchema),
  phone_numbers: z.array(PhoneNumberSchema),
  payment_details: z.object(
    {
      card: z.array(PaymentCardSchema),
      online_wallet: z.number(),

    },
  ),
})
export type User = z.infer<typeof UserSchema>
