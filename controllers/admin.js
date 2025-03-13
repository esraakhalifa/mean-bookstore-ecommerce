import Users from '../models/users.js';
import Books from '../models/books.js';

export const getAllUsers = async (req, res) => {
    try {
      const users = await Users.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
};

export const getAllBooks = async (req, res) => {
    try { 
        const books = await Books.find();
        const totalBooks = await Books.countDocuments();
        res.json({ books, totalBooks });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch books', error: err.message });
    }
};

export const getBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Books
        .findById(id)
        .populate('reviews')
        .exec();
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(book);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch book', error: err.message });
    }
};

export const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBook = await Books.findByIdAndDelete(id);
        if (!deletedBook) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete book', error: err.message });
    }
};

export const uploadBook = async (req, res) => {
    try {
      const { title, price, authors, description, stock, img } = req.body;
      
      const imageUrl = req.file ? req.file.path : (img || null);
      
      const newBook = new Books({ 
        title, 
        price: Number(price), 
        authors: authors ? JSON.parse(authors) : [], 
        description,
        stock: stock ? Number(stock) : 0,
        img: imageUrl
      });
      
      const savedBook = await newBook.save();
      console.log("Book saved successfully:", savedBook);
      
      res.status(201).json(savedBook);
    } catch (err) {
      console.error("Error uploading book:", err);
      res.status(500).json({ message: 'Failed to upload book', error: err.message });
    }
};

export const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, price, authors, description, stock, img } = req.body;
        
        const imageUrl = req.file ? req.file.path : (img || null);
        
        const updateData = { 
          title, 
          price: Number(price), 
          description,
          stock: Number(stock)
        };
        
        if (authors) updateData.authors = JSON.parse(authors);
        if (imageUrl) updateData.img = imageUrl;
        
        const updatedBook = await Books.findByIdAndUpdate(
            id, 
            updateData,
            { new: true }
        );
        
        if (!updatedBook) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        res.json(updatedBook);
    } catch (err) {
        console.error("Error updating book:", err);
        res.status(500).json({ message: 'Failed to update book', error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await Users.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user', error: err.message });
    }
};