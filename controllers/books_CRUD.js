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

// Get home page books with pagination
const homePage = async (req, res, page) => {
  try {
    if (page === undefined) page = 0;
    const total = await Books.countDocuments({});
    if (page < 0 || page > total / 10) {
      return res.json({status: 400, message: 'Invalid page number'});
    }
    const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
    return res.json({status: 200, message: 'Books retrieved successfully', books});
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

// Add a review to a book
const addReview = async (req, res, id, review) => {
  try {
    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

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

// Delete a review from a book
const deleteReview = async (req, res, id, rid) => {
  try {
    if (!id || !rid) return res.json({status: 400, message: 'Missing required data to delete review'});

    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

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

// Update a review
const updateReview = async (req, res, rid, review) => {
  try {
    if (review.comment === undefined && review.rate === undefined) {
      return res.json({status: 400, message: 'No data to update'});
    }

    const oldReview = await Reviews.findById(rid);
    if (!oldReview) return res.json({status: 404, message: 'Review not found'});

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
