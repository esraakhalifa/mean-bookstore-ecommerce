import mongoose from 'mongoose';
import Books from '../models/books.js';
import Users from '../models/users.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {page = 1, limit = 10} = req.query;

    const user = await Users.findById(userId).populate({
      path: 'cart.books.bookId',
      select: 'title authors price img stock'
    });

    if (!user) {
      return res.status(404).json({message: 'User not found'});
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
    console.error('Error fetching cart:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const addToCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {bookId, quantity = 1} = req.body;
    const userId = req.user.userId;

    if (quantity < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({message: 'Quantity must be at least 1'});
    }

    const book = await Books.findById(bookId).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'Book not found'});
    }

    const user = await Users.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'User not found'});
    }

    if (!user.cart) {
      user.cart = {books: [], totalAmount: 0};
    }

    const bookInCart = user.cart.books.find((item) => item.bookId.toString() === bookId);
    if (bookInCart) {
      const newQuantity = bookInCart.quantity + quantity;
      if (book.stock < newQuantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: 'Not enough stock available',
          available: book.stock,
          requested: newQuantity
        });
      }
      bookInCart.quantity = newQuantity;
    } else {
      if (book.stock < quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: 'Not enough stock available',
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
    console.error('Error adding to cart:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const removeFromCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {bookId} = req.params;
    const userId = req.user.userId;

    const book = await Books.findById(bookId).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'Book not found'});
    }

    const user = await Users.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'User not found'});
    }

    if (!user.cart || !user.cart.books.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({message: 'Cart is empty'});
    }

    const bookIndex = user.cart.books.findIndex((item) => item.bookId.toString() === bookId);
    if (bookIndex === -1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({message: 'This book is not in your cart'});
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
    console.error('Error removing from cart:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const updateCartItem = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {bookId, quantity} = req.body;
    const userId = req.user.userId;

    if (quantity < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({message: 'Quantity cannot be negative'});
    }

    const book = await Books.findById(bookId).session(session);
    if (!book) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'Book not found'});
    }

    const user = await Users.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'User not found'});
    }

    if (!user.cart || !user.cart.books.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({message: 'Cart is empty'});
    }

    const bookInCart = user.cart.books.find((item) => item.bookId.toString() === bookId);
    if (!bookInCart) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({message: 'This book is not in your cart'});
    }

    if (quantity === 0) {
      user.cart.totalAmount -= book.price * bookInCart.quantity;
      user.cart.books = user.cart.books.filter((item) => item.bookId.toString() !== bookId);
    } else {
      if (book.stock < quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: 'Not enough stock available',
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
    console.error('Error updating cart item:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const clearCart = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.userId;

    const user = await Users.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'User not found'});
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
    console.error('Error clearing cart:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getCartCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    const cartSize = user.cart && user.cart.books ? user.cart.books.length : 0;

    return res.status(200).json({cartSize});
  } catch (error) {
    console.error('Error getting cart count:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};
