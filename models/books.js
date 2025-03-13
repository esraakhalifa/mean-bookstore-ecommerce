import mongoose from 'mongoose';

// eslint-disable-next-line regexp/no-unused-capturing-group
const ISBNPattern = /^(97(8|9))?\d{9}(\d|X)$/;
const BookSchema = new mongoose.Schema({
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
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Thriller',
      'Drama',
      'Romance',
      'Software Engineering',
      'Science Fiction',
      'Fantasy',
      'Mystery',
      'Horror',
      'Biography',
      'Self-Help',
      'History',
      'Philosophy',
      'Business',
      'Psychology',
      'Technology',
      'Education'
    ]
  },
  ISBN: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator(isbn) {
        return ISBNPattern.test(isbn);
      },
      message: 'Invalid ISBN format.'
    }
  },
  language: {
    type: String,
    required: true,
    enum: ['English', 'French', 'Spanish', 'German', 'Arabic', 'Chinese', 'Japanese', 'Russian']
  },
  numPages: {
    type: Number,
    required: true,
    min: [1, 'A book must have at least one page.'],
    validate: {
      validator: Number.isInteger,
      message: 'Number of pages must be an integer.'
    }
  },
  rate: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1.'],
    max: [5, 'Rating cannot exceed 5.']
  }
});

const Books = mongoose.model('Book', BookSchema);

export default Books;
