import fs from 'node:fs';
import mongoose from 'mongoose';
import Books from '../models/books.js';

mongoose.connect('mongodb://localhost:27017/bookstore', {}).then(() => console.log('Connected to MongoDB')).catch((err) => console.error(err));

const booksData = JSON.parse(fs.readFileSync('books.json', 'utf-8'));

const seedDB = async () => {
  await Books.deleteMany();
  await Books.insertMany(booksData);
  console.log('Database Seeded');
  mongoose.connection.close();
};

seedDB();
