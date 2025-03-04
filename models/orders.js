import mongoose from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const connection = mongoose.connection;
const OrderSchema = mongoose.Schema(
  {
    _id: {
      type: Number
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    books: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Book',
      required: true,
      validate: {
        validator(arr) {
          return arr.length > 0;
        },
        message: 'User should at least order 1 book.'
      }
    },

    total_price:
        {
          type: Number,
          required: true,
          min: 1
        },
    payment_method: {
      type: String,
      required: true,
      enum: ['card', 'cash', 'online wallet']
    }

  },
  {timestamps: true}
);

OrderSchema.plugin(AutoIncrement(connection), {inc_field: '_id'});
