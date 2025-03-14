import Books from '../models/books.js';
import Reviews from '../models/reviews.js';

// Helper to match reviews by IDs
const arrayMatch = async (reviewsIDs) => {
  const reviewsArray = await Reviews.find({_id: {$in: reviewsIDs}});
  return reviewsArray;
};

// Count total number of books
const countRecords = async (req, res) => {
  try {
    const num = await Books.countDocuments({});
    return res.json({status: 200, message: 'Count retrieved successfully', count: num});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to count records'});
  }
};

// Recalculate rating based on reviews
const recalculateRating = async (id) => {
  const book = await Books.findById(id);
  if (!book) return;

  const reviews = await arrayMatch(book.reviews);
  let total = 0;
  reviews.forEach((review) => total += review.rating);
  const avg = total / reviews.length || 0; // Avoid NaN if no reviews

  await Books.findByIdAndUpdate(id, {rate: avg.toFixed(1)});
};

const homePage = async (req, res, page, limit) => {
  try {
    const total = await Books.countDocuments({});
    if (page < 0 || page > Math.ceil(total / limit)) {
      return res.json({status: 400, message: 'Invalid page number'});
    }
    // Updated to include description and use img instead of image
    const books = await Books.find({}, 'img title price description').skip(page * limit).limit(limit);
    return res.json({status: 200, message: 'Books retrieved successfully', books, total});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to retrieve books'});
  }
};

// Get book details
const bookDetails = async (req, res, id) => {
  try {
    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

    const bookObj = book.toObject();
    bookObj.reviews = await arrayMatch(book.reviews);

    return res.json({status: 200, message: 'Book details retrieved successfully', book: bookObj});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to retrieve book details'});
  }
};

// Get book details + related books for details page
const detailsPage = async (req, res, id) => {
  try {
    if (id === undefined) return res.json({status: 400, message: 'Missing required data to get details'});

    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

    const bookObj = book.toObject();
    bookObj.reviews = await arrayMatch(book.reviews);
    const relatedBooks = await Books.find({category: book.category}).limit(4);

    return res.json({
      status: 200,
      message: 'Book details and related books retrieved successfully',
      book: bookObj,
      relatedBooks
    });
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to retrieve details'});
  }
};

// Add a review to a book
const addReview = async (req, res, id, review, user) => {
  try {
    // Check if user is logged in
    if (!user) {
      return res.json({status: 401, message: 'Unauthorized: User not logged in'});
    }

    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

    // Add user ID to the review
    review.user = user._id;

    const userReview = await Reviews.create(review);
    book.reviews.push(userReview._id);
    await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
    await recalculateRating(id);

    return res.json({status: 200, message: 'Review added successfully'});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to add review'});
  }
};

// Update a review
const updateReview = async (req, res, rid, review, user) => {
  try {
    // Check if user is logged in
    if (!user) {
      return res.json({status: 401, message: 'Unauthorized: User not logged in'});
    }

    if (review.comment === undefined && review.rate === undefined) {
      return res.json({status: 400, message: 'No data to update'});
    }

    const oldReview = await Reviews.findById(rid);
    if (!oldReview) return res.json({status: 404, message: 'Review not found'});

    // Check if the user updating the review is the same user who created it
    if (oldReview.user.toString() !== user._id.toString()) {
      return res.json({status: 403, message: 'Forbidden: You can only update your own reviews'});
    }

    review.user = review.user._id;

    // Update the review
    await Reviews.findByIdAndUpdate(rid, review);

    if (review.rate !== undefined && review.rate !== oldReview.rate) {
      await recalculateRating(oldReview.book);
    }

    return res.json({status: 200, message: 'Review updated successfully'});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to update review'});
  }
};

// Delete a review from a book
const deleteReview = async (req, res, id, rid, user) => {
  try {
    // Check if user is logged in
    if (!user) {
      return res.json({status: 401, message: 'Unauthorized: User not logged in'});
    }

    if (!id || !rid) return res.json({status: 400, message: 'Missing required data to delete review'});

    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

    const review = await Reviews.findById(rid);
    if (!review) return res.json({status: 404, message: 'Review not found'});

    // Check if the user deleting the review is the same user who created it
    if (review.user.toString() !== user._id.toString()) {
      return res.json({status: 403, message: 'Forbidden: You can only delete your own reviews'});
    }

    review.user = review.user._id;

    book.reviews.pull(rid);
    await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
    await Reviews.findByIdAndDelete(rid);
    await recalculateRating(id);

    return res.json({status: 200, message: 'Review deleted successfully'});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to delete review'});
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
