import Books from '../models/books.js';
import Reviews from '../models/reviews.js';
import CustomError from '../utils/CustomError.js';

const arrayMatch = async (reviewsIDs) => {
  const reviewsArray = await Reviews.find({_id: {$in: reviewsIDs}});
  return reviewsArray;
};

const countRecords = async () => {
  const num = await Books.countDocuments({});
  return num;
};

const recalculateRating = async (id) => {
  const book = await Books.findById(id);
  const reviews = await arrayMatch(book.reviews);
  let total = 0;
  reviews.forEach((review) => {
    total += review.rating;
  });
  const avg = total / reviews.length;
  await Books.findByIdAndUpdate(id, {rate: avg.toFixed(1)});
};

const homePage = async (page) => {
  if (page === undefined) page = 0;
  const totalRecords = await countRecords();
  if (page < 0 || page > totalRecords / 10) {
    throw new CustomError('Invalid page number', 400);
  }
  const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
  return books;
};

const bookDetails = async (id) => {
  const book = await Books.findById(id);
  if (!book) {
    throw new CustomError('Book not found', 404);
  }
  book.reviews = await arrayMatch(book.reviews);
  return book;
};

const addReview = async (id, review) => {
  const book = await Books.findById(id);
  if (!book) {
    throw new CustomError('Book not found', 404);
  }
  const userReview = await Reviews.create(review);
  book.reviews.push(userReview._id);
  await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
  await recalculateRating(id);
};

const deleteReview = async (id, rid) => {
  if (id === undefined || rid === undefined) {
    throw new CustomError('Missing required data to delete review', 400);
  }
  const book = await Books.findById(id);
  if (!book) {
    throw new CustomError('Book not found', 404);
  }
  book.reviews.pull(rid);
  await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
  await Reviews.findByIdAndDelete(rid);
  await recalculateRating(id);
};

const updateReview = async (rid, review) => {
  if (review.comment === undefined && review.rate === undefined) {
    throw new CustomError('No data to update', 400);
  }
  const oldReview = await Reviews.findById(rid);
  if (!oldReview) {
    throw new CustomError('Review not found', 404);
  }
  if (review.rate !== oldReview.rate) {
    await recalculateRating(oldReview.book);
  }
  await Reviews.findByIdAndUpdate(rid, review);
};

const detailsPage = async (id) => {
  if (id === undefined) {
    throw new CustomError('Missing required data to get details', 400);
  }
  const book = await bookDetails(id);
  if (!book) {
    throw new CustomError('Book not found', 404);
  }
  const relatedBooks = await Books.find({category: book.category}).limit(4);
  return {book, relatedBooks};
};

export {
  addReview,
  bookDetails,
  countRecords,
  deleteReview,
  detailsPage,
  homePage,
  updateReview
};
