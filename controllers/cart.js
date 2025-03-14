import mongoose from 'mongoose';
import Books from '../models/books.js';
import Users from '../models/users.js';
import CustomError from '../utils/CustomError.js';

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {page = 1, limit = 10} = req.query;

    const user = await Users.findById(userId).populate({
      path: 'cart.books.bookId',
      select: 'title authors price img stock'
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const cartItems = user.cart.books.map((item) => {
      const bookDetails = item.bookId;
      const total = bookDetails.price * item.quantity;
      return {
        book: {
          _id: bookDetails._id,
          title: bookDetails.title,
          authors: bookDetails.authors,
          price: bookDetails.price,
          img: bookDetails.img,
          stock: bookDetails.stock
        },
        quantity: item.quantity,
        total
      };
    });

    const totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = cartItems.slice(startIndex, endIndex);

    return res.status(200).json({
      cartItems: paginatedItems,
      totalAmount,
      totalItems: cartItems.length,
      currentPage: Number(page),
      totalPages: Math.ceil(cartItems.length / limit)
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {bookId, quantity = 1} = req.body;
    const userId = req.user.userId;

    if (quantity < 1) {
      throw new CustomError('Quantity must be at least 1', 400);
    }

    const book = await Books.findById(bookId).session(session);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const user = await Users.findById(userId).session(session);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (!user.cart) {
      user.cart = {books: [], totalAmount: 0};
    }

    const bookInCart = user.cart.books.find((item) => item.bookId.toString() === bookId);
    if (bookInCart) {
      const newQuantity = bookInCart.quantity + quantity;
      if (book.stock < newQuantity) {
        throw new CustomError('Not enough stock available', 400, {
          available: book.stock,
          requested: newQuantity
        });
      }
      bookInCart.quantity = newQuantity;
    } else {
      if (book.stock < quantity) {
        throw new CustomError('Not enough stock available', 400, {
          available: book.stock,
          requested: quantity
        });
      }
      user.cart.books.push({bookId, quantity});
    }

    user.cart.totalAmount += book.price * quantity;
    await user.save({session});

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: `Added ${quantity} copy/copies of "${book.title}" to your cart`,
      cartSize: user.cart.books.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {bookId} = req.params;
    const userId = req.user.userId;

    const book = await Books.findById(bookId).session(session);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const user = await Users.findById(userId).session(session);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (!user.cart || !user.cart.books.length) {
      throw new CustomError('Cart is empty', 400);
    }

    const bookIndex = user.cart.books.findIndex((item) => item.bookId.toString() === bookId);
    if (bookIndex === -1) {
      throw new CustomError('This book is not in your cart', 400);
    }

    const {quantity} = user.cart.books[bookIndex];
    user.cart.totalAmount -= book.price * quantity;
    user.cart.books.splice(bookIndex, 1);

    await user.save({session});

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: `Removed "${book.title}" from your cart`,
      cartSize: user.cart.books.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {bookId, quantity} = req.body;
    const userId = req.user.userId;

    if (quantity < 0) {
      throw new CustomError('Quantity cannot be negative', 400);
    }

    const book = await Books.findById(bookId).session(session);
    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    const user = await Users.findById(userId).session(session);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (!user.cart || !user.cart.books.length) {
      throw new CustomError('Cart is empty', 400);
    }

    const bookInCart = user.cart.books.find((item) => item.bookId.toString() === bookId);
    if (!bookInCart) {
      throw new CustomError('This book is not in your cart', 400);
    }

    if (quantity === 0) {
      user.cart.totalAmount -= book.price * bookInCart.quantity;
      user.cart.books = user.cart.books.filter((item) => item.bookId.toString() !== bookId);
    } else {
      if (book.stock < quantity) {
        throw new CustomError('Not enough stock available', 400, {
          available: book.stock,
          requested: quantity
        });
      }
      user.cart.totalAmount += book.price * (quantity - bookInCart.quantity);
      bookInCart.quantity = quantity;
    }

    await user.save({session});

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: quantity === 0 ? `Removed "${book.title}" from your cart` : `Updated "${book.title}" quantity to ${quantity}`,
      cartSize: user.cart.books.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.userId;

    const user = await Users.findById(userId).session(session);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    user.cart = {books: [], totalAmount: 0};
    await user.save({session});

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Cart cleared successfully',
      cartSize: 0
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getCartCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await Users.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const cartSize = user.cart && user.cart.books ? user.cart.books.length : 0;

    return res.status(200).json({cartSize});
  } catch (error) {
    next(error);
  }
};
