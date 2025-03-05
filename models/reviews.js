import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Book'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    comment: {
      type: String,
      maxLength: 500
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  },
  {timestamps: true}
);
const Reviews = mongoose.model('Review', ReviewSchema);
export default Reviews;
