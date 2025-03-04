import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const cardNumberRegex = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$/;
const egyptianMobileRegex = /^(\+20|0)1[0-25]{1}[0-9]{8}$/;
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const email = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

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


const UserSchema = new mongoose.Schema({
    _id:{
        type:Number
    },
  firstName:
   { type: String, required: true, match: /^[a-z]+$/i },
  lastName: { type: String, required: true , match: /^[a-z]+$/i},
  userName: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: email
  },
  password:{
    type:String,
    required:true,
    match: strongPassword
  },
  isVerified:{
    type:Boolean,
    default:false,
  },
  role: { 
    type: String, 
    enum: ["customer", "admin"], 
    required: true 
  },
  cart: {
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }], // Assuming books are stored in a separate collection
    totalAmount: { type: Number, min: 1, default: 0 }
  },
  profile: {
    addresses: [{ 
      street: String,
      city: String,
      Governorate: String, // later make it an enum
      country: String,
      postalCode: String // later check for the validations
    }],
    phone_numbers: [{ type: String,
        match: egyptianMobileRegex
     }]
  },
  payment_details: {
    card: [{
      card_number: { type: String,
        match: cardNumberRegex
      }
    }],
    online_wallet: {
      wallet_number: { type: Number }
    }
  }
}, { timestamps: true }); 


UserSchema.pre('save', function (next) {
    this.password = bcrypt.hashSync(this.password, 10);
    next();
  });
UserSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate(); 
    
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    }
  
    next();
  });
UserSchema.methods.comparePasswords = function (password) {
    return bcrypt.compareSync(password, this.password);
  };

const Users = mongoose.model("User", UserSchema);
export default Users;