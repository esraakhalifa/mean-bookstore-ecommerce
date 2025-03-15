import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema(
  {

    title: {
      type: String,
      required: true,
      unique: true
    },
    authors: {
      type: [String],
      validate: {
        validator(arr) {
          return arr.length > 0;
        },
        message: 'A book must have at least one author'
      }
    },
    price: {
      type: Number,
      required: true,
      min: 1
    },
    description: {
      type: String,
      required: true
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer.'
      }
    },
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }],
    img: {
      type: String

    }
  }
);

const Books = mongoose.model('Book', BookSchema);

export default Books;
