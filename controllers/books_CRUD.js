import Books from '../models/books.js';
import Reviews from '../models/reviews.js';

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
  if (page < 0 || page > countRecords() / 10) {
    throw new Error('Invalid page number');
  }
  const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
  return books;
};

const bookDetails = async (id) => {
  const book = await Books.findById(id);
  book.reviews = await arrayMatch(book.reviews);
  return book;
};

const addReview = async (id, review) => {
  const book = await Books.findById(id);
  const userReview = await Reviews.create(review);
  book.reviews.push(userReview._id);
  await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
  await recalculateRating(id);
};

const deleteReview = async (id, rid) => {
  if (id === undefined || rid === undefined) {
    throw new Error('Missing required data  to delete review');
  }
  const book = await Books.findById(id);
  book.reviews.pull(rid);
  await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
  await Reviews.findByIdAndDelete(rid);
  await recalculateRating(id);
};

const updateReview = async (rid, review) => {
  if (review.comment === undefined && review.rate === undefined) {
    throw new Error('No data to update');
  }
  const oldReview = await Reviews.findById(rid);
  if (review.rate !== oldReview.rate) {
    recalculateRating(oldReview.book);
  }
  await Reviews.findByIdAndUpdate(rid, review);
};

const detailsPage = async (id) => {
  if (id === undefined) {
    throw new Error('Missing required data to get details');
  }
  const book = await bookDetails(id);
  if (book === null) {
    throw new Error('Book not found');
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
