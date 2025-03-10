import Books from '../models/books.js';
import Users from '../models/users.js';

export const getUserCartData = async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).populate('cart.books.bookId');
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }
    res.status(200).json(user.cart);
  } catch (error) {
    res.status(500).json({message: 'Server Error'});
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.params.id;
    const {bookId} = req.body;

    const user = await Users.findById(userId);
    const book = await Books.findById(bookId);

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }
    if (!book) {
      return res.status(404).json({message: 'Book not found'});
    }
    if (book.stock <= 0) {
      return res.status(400).json({message: 'Not enough stock available'});
    }

    const bookIndex = user.cart.books.findIndex(
      (item) => item.bookId.toString() === bookId
    );

    if (bookIndex !== -1) {
      // the book is already in the cart -> increase quantity by 1
      user.cart.books[bookIndex].quantity += 1;
      user.cart.totalAmount += book.price;
    } else {
      // the book is not in the cart -> add it
      user.cart.books.push({bookId, quantity: 1});
    }
    try {
      await user.save();
    } catch (error) {
      console.error('Error saving user:', error);
    }
    res.status(200).json({message: 'Cart updated successfully', user});
  } catch (error) {
    res.status(500).json({message: 'Server Error'});
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const userId = req.params.id;
    const {bookId} = req.body;
    const user = await Users.findById(userId);
    const book = await Books.findById(bookId);
    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }
    if (!book) {
      return res.status(404).json({message: 'Book not found'});
    }
    const bookIndex = user.cart.books.findIndex(
      (item) => item.bookId.toString() === bookId
    );
    if (bookIndex !== -1) {
      // the book is already in the cart -> decrease quantity by 1
      user.cart.books[bookIndex].quantity -= 1;
      user.cart.totalAmount += book.price;
    } else {
      // the book is not in the cart
      return res.status(404).json({message: 'Book not found in the cart'});
    }
    await user.save();
    res.status(200).json({message: 'Cart updated successfully', user});
  } catch (error) {
    res.status(500).json({message: 'Server Error', error});
  }
};
