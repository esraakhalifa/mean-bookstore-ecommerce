import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const cardNumberRegex = /^(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|3(?:0[0-5]|[68]\d)\d{11}|6(?:011|5\d{2})\d{12}|(?:2131|1800|35\d{3})\d{11})$/;
const egyptianMobileRegex = /^(\+20|0)1[0-25]\d{8}$/;
// const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const email = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

const UserSchema = new mongoose.Schema({

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  firstName:
   {type: String, required: true, match: /^[a-z]+$/i},
  lastName: {type: String, required: true, match: /^[a-z]+$/i},
  userName: {type: String, required: true, unique: true},
  email: {
    type: String,
    required: true,
    unique: true,
    match: email
  },
  password: {
    type: String,
    required() { return !this.googleId }
    // match: strongPassword
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    required: true
  },
  cart: {
    books: [{
      bookId: {type: mongoose.Schema.Types.ObjectId, ref: 'Book'},
      quantity: {type: Number, min: 1, default: 1}
    }],
    totalAmount: {type: Number, min: 0, default: 0}
  },
  profile: {
    addresses: [{
      street: String,
      city: String,
      governorate: String, // later make it an enum //i rewrote Governorate -> governorate
      country: String,
      postalCode: String // later check for the validations
    }],
    phone_numbers: [{type: String, match: egyptianMobileRegex}]
  },
  payment_details: {
    card: [{
      card_number: {type: String, match: cardNumberRegex}
    }],
    online_wallet: {type: Number}
  }
}, {timestamps: true});

UserSchema.pre('save', function (next) {
  if (this.password && !this.isModified('password')) {
    // if (!strongPassword.test(this.password)) {
    //   return next(new Error('Password must contain at least one lowercase letter, one uppercase letter, one digit, one special character, and be at least 8 characters long.'));
    // }
    this.password = bcrypt.hashSync(this.password, 10);
  }
  next();
});

UserSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();

  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }
  next();
});

UserSchema.methods.comparePasswords = function (password) {
  return bcrypt.compareSync(password, this.password);
};

const Users = mongoose.model('User', UserSchema);
export default Users;