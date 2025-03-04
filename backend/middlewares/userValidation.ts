import { z } from 'zod';
import Users from '../models/users';
const cardNumberRegex = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$/;
const egyptianMobileRegex = /^(\+20|0)1[0-25]{1}[0-9]{8}$/;
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const email = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const username = /^[^\/\\\s]+$/;

/**
 * PK | user id Objectld |
 *  firstName string required |
 *  lastName string required |
 *  userName string required | 
 * role enum[customer, admin] required |
 *  cart object: books[], totalAmount: number min: 1 |
 *  profile object: addresses[address {}], phone_numbers |
 *  payment_details{ card{card_number: string}, online_wallet{wallet_number}}:
 */

const UserSchema = z.object({
  firstName: z.string().regex(/^[a-z]+$/i),
  lastName: z.string().regex(/^[a-z]+$/i),
  userName: z.string().regex(username).refine(async (value) =>
  {
    const existingUserByUsername = await Users.find({userName:value});
    return existingUserByUsername != null;
  }, {
    message: "Username is already taken",
  }
  ),
  email: z.string().regex(email).refine(async (value) => {
    const existingUserByEmail = await Users.find({email:value});
    return existingUserByEmail != null;
  }, {
    message: "Email is already taken",
  }),
  password: z.string().regex(strongPassword),
  isVerified:z.boolean().default(false)
  ,role: z.enum(["customer", "admin"]),
  cart:z.array()
});

try {
  const data = schema.parse({ name: 'Alice', age: 30 });
} catch (err) {
  console.log(err.errors);
}