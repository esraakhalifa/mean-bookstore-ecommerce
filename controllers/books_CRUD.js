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
  if (Object.keys(book) === 0) throw new Error('There is no book with this id.');
  let reviews = [];
  if (book.reviews.length > 0) {
    reviews = await arrayMatch(book.reviews);
  }
  let total = 0;
  reviews.forEach((review) => {
    total += review.rating;
  });
  const avg = total / reviews.length;
  await Books.findByIdAndUpdate(id, {rate: avg.toFixed(1)});
};

const homePage = async (query) => {
  if (query.page === undefined) query.page = 0;
  if (query.page < 0 || query.page > countRecords() / 10) {
    throw new Error('Invalid page number');
  }
  const {page, ...filters} = query;
  const books = await Books.find(filters, 'image title price category rate').skip(page * 10).limit(10);
  return books;
};

const bookDetails = async (id) => {
  const book = await Books.findById(id);
  if (Object.keys(book).length === 0) {
    throw new Error('Book not found');
  }
  if (book.reviews.length > 0) {
    book.reviews = await arrayMatch(book.reviews);
  }
  return book;
};

const addReview = async (id, review) => {
  if (id === undefined) throw new Error('Missing id');
  const book = await Books.findById(id);
  if (Object.keys(book) === 0) throw new Error('there is no book with this id.');
  for (let data in review) {
    if (review[data] === undefined) throw new Error('Review data missing..');
  }
  if (!review.user.id) throw new Error('can not get user id pls try again later');
  review.user = review.user.id;
  const userReview = await Reviews.create(review);
  book.reviews.push(userReview._id);
  await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
  await recalculateRating(id);
};

const deleteReview = async (id, rid, user) => {
  if (id === undefined || rid === undefined) {
    throw new Error('Missing required data to delete review');
  }
  if (!user.id) throw new Error('can not get user id pls try again later');
  const review = await Reviews.findOne({_id: rid});
  if (Object.keys(review) === 0) throw new Error('Wrong review id.');
  if (review.user.toString() !== user.id.toSrting()) throw new Error('authorization failed');
  const book = await Books.findById(id);
  if (Object.keys(book) === 0) throw new Error('wrong id.');
  book.reviews.pull(rid);
  await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
  await Reviews.findByIdAndDelete(rid);
  await recalculateRating(id);
};

const updateReview = async (rid, review) => {
  if (rid === undefined) throw new Error('review id is not defined');
  for (let data in review) {
    if (review[data] === undefined) throw new Error('Review data missing..');
  }
  if (!review.user.id) throw new Error('can not get user id pls try again later');
  review.user = review.user.id;
  const oldReview = await Reviews.findById(rid);
  if (Object.keys(oldReview) === 0) throw new Error('wrong id.');
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
