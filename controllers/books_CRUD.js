import Books from '../models/books.js';
import Reviews from '../models/reviews.js';
import CustomError from '../utils/CustomError.js'; // Import CustomError

const arrayMatch = async (reviewsIDs) => {
  const reviewsArray = await Reviews.find({_id: {$in: reviewsIDs}});
  return reviewsArray;
};

const countRecords = async (req, res, next) => {
  try {
    const num = await Books.countDocuments({});
    return res.json({status: 200, message: 'Count retrieved successfully', count: num});
  } catch (error) {
    next(new CustomError('Failed to count records', 500));
  }
};

const recalculateRating = async (id) => {
  const book = await Books.findById(id);
  if (!book) return;

  const reviews = await arrayMatch(book.reviews);
  let total = 0;
  reviews.forEach((review) => total += review.rating);
  const avg = total / reviews.length || 0; // Avoid NaN if no reviews

  await Books.findByIdAndUpdate(id, {rate: avg.toFixed(1)});
};

// Get home page books with pagination
const homePage = async (req, res, next, page) => {
  try {
    if (page === undefined) page = 0;
    const total = await Books.countDocuments({});
    if (page < 0 || page > total / 10) {
      throw new CustomError('Invalid page number', 400);
    }
    const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
    res.json({status: 200, message: 'Books retrieved successfully', books});
  } catch (error) {
    next(new CustomError('Failed to retrieve books', 500));
  }
};

// Get book details
const bookDetails = async (req, res, next, id) => {
  try {
    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const bookObj = book.toObject();
    bookObj.reviews = await arrayMatch(book.reviews);

    res.json({status: 200, message: 'Book details retrieved successfully', book: bookObj});
  } catch (error) {
    next(new CustomError('Failed to retrieve book details', 500));
  }
};

// Get book details + related books for details page
const detailsPage = async (req, res, next, id) => {
  try {
    if (id === undefined) {
      throw new CustomError('Missing required data to get details', 400);
    }

    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const bookObj = book.toObject();
    bookObj.reviews = await arrayMatch(book.reviews);
    const relatedBooks = await Books.find({category: book.category}).limit(4);

    res.json({
      status: 200,
      message: 'Book details and related books retrieved successfully',
      book: bookObj,
      relatedBooks
    });
  } catch (error) {
    next(new CustomError('Failed to retrieve details', 500));
  }
};

// Add a review to a book
const addReview = async (req, res, next, id, review, user) => {
  try {
    // Check if user is logged in
    if (!user) {
      throw new CustomError('Unauthorized: User not logged in', 401);
    }

    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    // Add user ID to the review
    review.user = user._id;

    const userReview = await Reviews.create(review);
    book.reviews.push(userReview._id);
    await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
    await recalculateRating(id);

    res.json({status: 200, message: 'Review added successfully'});
  } catch (error) {
    next(new CustomError('Failed to add review', 500));
  }
};

// Update a review
const updateReview = async (req, res, next, rid, review, user) => {
  try {
    // Check if user is logged in
    if (!user) {
      throw new CustomError('Unauthorized: User not logged in', 401);
    }

    if (review.comment === undefined && review.rate === undefined) {
      throw new CustomError('No data to update', 400);
    }

    const oldReview = await Reviews.findById(rid);
    if (!oldReview) {
      throw new CustomError('Review not found', 404);
    }

    // Check if the user updating the review is the same user who created it
    if (oldReview.user.toString() !== user._id.toString()) {
      throw new CustomError('Forbidden: You can only update your own reviews', 403);
    }

    review.user = review.user._id;

    // Update the review
    await Reviews.findByIdAndUpdate(rid, review);

    if (review.rate !== undefined && review.rate !== oldReview.rate) {
      await recalculateRating(oldReview.book);
    }

    res.json({status: 200, message: 'Review updated successfully'});
  } catch (error) {
    next(new CustomError('Failed to update review', 500));
  }
};

// Delete a review from a book
const deleteReview = async (req, res, next, id, rid, user) => {
  try {
    // Check if user is logged in
    if (!user) {
      throw new CustomError('Unauthorized: User not logged in', 401);
    }

    if (!id || !rid) {
      throw new CustomError('Missing required data to delete review', 400);
    }

    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const review = await Reviews.findById(rid);
    if (!review) {
      throw new CustomError('Review not found', 404);
    }

    // Check if the user deleting the review is the same user who created it
    if (review.user.toString() !== user._id.toString()) {
      throw new CustomError('Forbidden: You can only delete your own reviews', 403);
    }

    review.user = review.user._id;

    book.reviews.pull(rid);
    await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
    await Reviews.findByIdAndDelete(rid);
    await recalculateRating(id);

    res.json({status: 200, message: 'Review deleted successfully'});
  } catch (error) {
    next(new CustomError('Failed to delete review', 500));
  }
};

// Export all handlers
export {
  addReview,
  bookDetails,
  countRecords,
  deleteReview,
  detailsPage,
  homePage,
  updateReview
};
