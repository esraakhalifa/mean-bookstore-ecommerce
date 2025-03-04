import mongoose from 'mongoose';

/**
 * Reviews

PK Review_ID: Object_ID

Book Object_ID Required REF

User Object_ID Required REF

Comment String

Rate Number Required, range(0,5)

CreatedAt TimeStamp Required
 */
const ReviewSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Book'
    },
    user: {
      type: Number,
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
      max: 5
    }
  },
  {timestamps: true}
);
const Reviews = mongoose.model('Review', ReviewSchema);
export default Reviews;
