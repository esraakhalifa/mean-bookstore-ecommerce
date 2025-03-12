import mongoose from 'mongoose';

const OrderSchema = mongoose.Schema(
  {
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

const Orders = mongoose.model('Order', OrderSchema);
export default Orders;
