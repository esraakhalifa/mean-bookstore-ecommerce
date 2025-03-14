import Books from '../models/books.js';
import Reviews from '../models/reviews.js';
import Users from '../models/users.js';
import CustomError from '../utils/CustomError.js';

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
    throw new CustomError('Failed to fetch reviews', 500, {error});
  }
};

const countRecords = async (req, res, next) => {
  try {
    const num = await Books.countDocuments({});
    return res.json({status: 200, message: 'Count retrieved successfully', count: num});
  } catch (error) {
    next(new CustomError('Failed to count records', 500, {error}));
  }
};

const recalculateRating = async (id) => {
  try {
    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const reviewIds = Array.isArray(book.reviews) ? book.reviews : [];
    const reviewsWithNames = await arrayMatch(reviewIds);

    if (reviewsWithNames.length === 0) {
      await Books.findByIdAndUpdate(id, {rate: 0});
      return;
    }

    const total = reviewsWithNames.reduce((sum, review) => {
      const rating = Number(review.rating);
      return sum + (Number.isNaN(rating) ? 0 : rating);
    }, 0);

    const avg = total / reviewsWithNames.length;
    const roundedAvg = Number(avg.toFixed(1));

    await Books.findByIdAndUpdate(id, {rate: roundedAvg}, {new: true});
  } catch (error) {
    throw new CustomError('Failed to recalculate rating', 500, {error});
  }
};

const homePage = async (req, res, next, page) => {
  try {
    if (page === undefined) page = 0;
    const total = await Books.countDocuments({});
    if (page < 0 || page > total / 10) {
      throw new CustomError('Invalid page number', 400);
    }
    const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
    return res.json({status: 200, message: 'Books retrieved successfully', books});
  } catch (error) {
    next(new CustomError('Failed to retrieve books', 500, {error}));
  }
};

const bookDetails = async (req, res, next, id) => {
  try {
    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const bookObj = book.toObject();
    bookObj.reviews = await arrayMatch(book.reviews);

    return res.json({status: 200, message: 'Book details retrieved successfully', book: bookObj});
  } catch (error) {
    next(new CustomError('Failed to retrieve book details', 500, {error}));
  }
};

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

    return res.json({
      status: 200,
      message: 'Book details and related books retrieved successfully',
      book: bookObj,
      relatedBooks
    });
  } catch (error) {
    next(new CustomError('Failed to retrieve details', 500, {error}));
  }
};

const addReview = async (req, res, next, id, review) => {
  try {
    if (!req.user) {
      throw new CustomError('Unauthorized: User not logged in', 401);
    }

    const book = await Books.findById(id);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    review.user = req.user.userId;
    const userReview = await Reviews.create(review);
    book.reviews.push(userReview._id);
    await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
    await recalculateRating(id);

    return res.json({status: 200, message: 'Review added successfully'});
  } catch (error) {
    next(new CustomError('Failed to add review', 500, {error}));
  }
};

const updateReview = async (req, res, next, rid, review) => {
  try {
    if (!req.user) {
      throw new CustomError('Unauthorized: User not logged in', 401);
    }

    if (review.comment === undefined && review.rate === undefined) {
      throw new CustomError('No data to update', 400);
    }

    const oldReview = await Reviews.findById(rid);
    if (!oldReview) {
      throw new CustomError('Review not found', 404);
    }

    if (oldReview.user.toString() !== req.user.userId.toString()) {
      throw new CustomError('Forbidden: You can only update your own reviews', 403);
    }

    review.user = req.user.userId;
    await Reviews.findByIdAndUpdate(rid, review);

    if (review.rate !== undefined && review.rate !== oldReview.rate) {
      await recalculateRating(oldReview.book);
    }

    return res.json({status: 200, message: 'Review updated successfully'});
  } catch (error) {
    next(new CustomError('Failed to update review', 500, {error}));
  }
};

const deleteReview = async (req, res, next, id, rid) => {
  try {
    if (!req.user) {
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

    if (review.user.toString() !== req.user.userId.toString()) {
      throw new CustomError('Forbidden: You can only delete your own reviews', 403);
    }

    book.reviews.pull(rid);
    await Books.findByIdAndUpdate(id, {reviews: book.reviews}, {new: true});
    await Reviews.findByIdAndDelete(rid);
    await recalculateRating(id);

    return res.json({status: 200, message: 'Review deleted successfully'});
  } catch (error) {
    next(new CustomError('Failed to delete review', 500, {error}));
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
