import Books from '../models/books.js';
import Reviews from '../models/reviews.js';
import Users from '../models/users.js';

const arrayMatch = async (reviewsIDs) => {
  try {
    const reviewsArray = await Reviews.find({_id: {$in: reviewsIDs}});

    const reviewsWithNames = await Promise.all(
      reviewsArray.map(async (element) => {
        try {
          if (!element.user) {
            console.warn('Review has no user:', element._id);
            return {
              ...element.toObject(),
              name: 'Unknown User'
            };
          }

          const userData = await Users.findById(element.user);

          if (!userData) {
            console.warn('User not found for review:', element._id);
            return {
              ...element.toObject(),
              name: 'Unknown User'
            };
          }

          return {
            ...element.toObject(),
            name: `${userData.firstName} ${userData.lastName}`
          };
        } catch (error) {
          console.error('Error fetching user data for review:', element._id, error);
          return {
            ...element.toObject(),
            name: 'Unknown User'
          };
        }
      })
    );
    return reviewsWithNames;
  } catch (error) {
    console.error('Error in arrayMatch:', error);
    throw error;
  }
};

const countRecords = async (req, res) => {
  try {
    const num = await Books.countDocuments({});
    return res.json({status: 200, message: 'Count retrieved successfully', count: num});
  } catch (error) {
    console.error(error);
    return res.json({status: 500, message: 'Failed to count records'});
  }
};

const recalculateRating = async (id) => {
  try {
    // Find the book by ID
    const book = await Books.findById(id);
    if (!book) {
      console.error('Book not found');
      return;
    }

    const reviewIds = Array.isArray(book.reviews) ? book.reviews : [];

    // Use your existing function to get reviews with user names
    const reviewsWithNames = await arrayMatch(reviewIds);

    // Handle case where there are no reviews
    if (reviewsWithNames.length === 0) {
      await Books.findByIdAndUpdate(id, {rate: 0});
      return;
    }

    // Calculate total rating safely
    const total = reviewsWithNames.reduce((sum, review) => {
      const rating = Number(review.rating);
      return sum + (Number.isNaN(rating) ? 0 : rating); // Ignore invalid ratings
    }, 0);

    // Calculate average and round to 1 decimal place
    const avg = total / reviewsWithNames.length;
    const roundedAvg = Number(avg.toFixed(1));

    // Update the book's rating
    await Books.findByIdAndUpdate(id, {rate: roundedAvg}, {new: true});
  } catch (error) {
    console.error('Error recalculating rating:', error);
  }
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

const addReview = async (req, res, id, review) => {
  try {
    if (!req.user) {
      return res.json({status: 401, message: 'Unauthorized: User not logged in'});
    }
    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

    review.user = req.user.userId;
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

const updateReview = async (req, res, rid, review) => {
  try {
    if (!req.user) {
      return res.json({status: 401, message: 'Unauthorized: User not logged in'});
    }

    if (review.comment === undefined && review.rate === undefined) {
      return res.json({status: 400, message: 'No data to update'});
    }

    const oldReview = await Reviews.findById(rid);
    if (!oldReview) return res.json({status: 404, message: 'Review not found'});

    if (oldReview.user.toString() !== req.user.userId.toString()) {
      return res.json({status: 403, message: 'Forbidden: You can only update your own reviews'});
    }

    review.user = req.user.userId;

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

const deleteReview = async (req, res, id, rid) => {
  try {
    if (!req.user) {
      return res.json({status: 401, message: 'Unauthorized: User not logged in'});
    }

    if (!id || !rid) return res.json({status: 400, message: 'Missing required data to delete review'});

    const book = await Books.findById(id);
    if (!book) return res.json({status: 404, message: 'Book not found'});

    const review = await Reviews.findById(rid);
    if (!review) return res.json({status: 404, message: 'Review not found'});

    if (review.user.toString() !== req.user.userId.toString()) {
      return res.json({status: 403, message: 'Forbidden: You can only delete your own reviews'});
    }

    review.user = req.user.userId;

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

export {
  addReview,
  bookDetails,
  countRecords,
  deleteReview,
  detailsPage,
  homePage,
  updateReview
};
