import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import {createClient} from 'redis';
import connectDB from './config/db.js';
import passport from './config/passport.js';
import cache from './middlewares/cache/bookCache.js';
import router from './routes/index.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(router);

connectDB();

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false}
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(router);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const RedisClient = createClient({
  url: 'redis://localhost:6379'
});
RedisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await RedisClient.connect();
  console.log('Redis Connected');
}
connectRedis();

// Test scenarios for Redis caching functions

// 1. Test caching a book
// - Create a book object
// - Cache it using cacheBook()
// - Retrieve it using getCachedBook() and compare the data
async function testCacheBook() {
  const book = {_id: '1', title: 'Book One', authors: ['Author A'], price: 10, description: 'A great book', stock: 5, img: '', category: 'fiction', rating: 4.5};
  await cache.cacheBook(book);
  const cachedBook = await cache.getCachedBook(book);
  console.assert(cachedBook.title === book.title, 'Cached book title mismatch');
}

// 2. Test deleting a book from cache
// - Cache a book
// - Delete it using deleteFromCache()
// - Try retrieving it, expect null
async function testDeleteBook() {
  const book = {_id: '2', title: 'Book Two', authors: ['Author B'], price: 15, description: 'Another book', stock: 3, img: '', category: 'non-fiction', rating: 4};
  await cache.cacheBook(book);
  await cache.deleteFromCache(book);
  const cachedBook = await cache.getCachedBook(book);
  console.assert(cachedBook === null, 'Book should be deleted from cache');
}

// 3. Test updating a book in cache
// - Cache a book
// - Modify some fields and update cache using updateCache()
// - Retrieve and verify updated fields
async function testUpdateCache() {
  const book = {_id: '3', title: 'Book Three', authors: ['Author C'], price: 20, description: 'A fascinating book', stock: 10, img: '', category: 'history', rating: 5};
  await cache.cacheBook(book);
  book.price = 25;
  await cache.updateCache(book);
  const cachedBook = await cache.getCachedBook(book);
  console.assert(cachedBook.price === 25, 'Updated book price mismatch');
}

// 4. Test book indexing
// - Cache a book
// - Index it using indexBook()
// - Search by price range and verify book presence
async function testIndexBook() {
  const book = {_id: '4', title: 'Indexed Book', authors: ['Author D'], price: 30, description: 'An indexed book', stock: 7, img: '', category: 'science', rating: 3.5};
  await cache.cacheBook(book);
  await cache.indexBook(book);
  const results = await cache.searchByPrice(20, 40);
  console.assert(results.includes(book._id), 'Book not found in price index');
}

// 5. Test filtering books by category
// - Cache books with different categories
// - Retrieve books by category and check results
async function testFilterByCategory() {
  const book1 = {_id: '5', title: 'Sci-Fi Book', authors: ['Author E'], price: 22, description: 'A sci-fi adventure', stock: 6, img: '', category: 'sci-fi', rating: 4.8};
  const book2 = {_id: '6', title: 'Fantasy Book', authors: ['Author F'], price: 18, description: 'A fantasy epic', stock: 8, img: '', category: 'fantasy', rating: 4.2};
  await cache.cacheBook(book1);
  await cache.cacheBook(book2);
  await cache.indexBook(book1);
  await cache.indexBook(book2);
  const sciFiBooks = await cache.filterByCategory('sci-fi');
  console.assert(sciFiBooks.includes(book1._id), 'Sci-Fi book not found in category filter');
}

// 6. Test caching books by pages
// - Cache multiple books using cacheByPage()
// - Retrieve them using getPageCache()
// - Compare retrieved books with original data
async function testCacheByPage() {
  const books = [
    {_id: '7', title: 'Page Book 1', authors: ['Author G'], price: 12, description: 'A book on page 1', stock: 9, img: '', category: 'mystery', rating: 3.9},
    {_id: '8', title: 'Page Book 2', authors: ['Author H'], price: 14, description: 'Another book on page 1', stock: 4, img: '', category: 'thriller', rating: 4.1}
  ];
  await cache.cacheByPage(1, books);
  const cachedBooks = await cache.getPageCache(1);
  console.assert(cachedBooks.length === books.length, 'Page cache book count mismatch');
}

// 7. Test retrieving all cached books
// - Cache multiple books
// - Retrieve all cached books
// - Compare retrieved count with expected count
async function testGetAllCachedBooks() {
  const books = [
    {_id: '9', title: 'All Books 1', authors: ['Author I'], price: 16, description: 'First cached book', stock: 2, img: '', category: 'drama', rating: 4.0},
    {_id: '10', title: 'All Books 2', authors: ['Author J'], price: 28, description: 'Second cached book', stock: 5, img: '', category: 'romance', rating: 4.7}
  ];
  await cache.cacheBook(books[0]);
  await cache.cacheBook(books[1]);
  const allBooks = await cache.getAllCachedBooks();
  console.assert(allBooks.length >= 2, 'All cached books count mismatch');
}

// Execute all test cases
(async () => {
  await testCacheBook();
  await testDeleteBook();
  await testUpdateCache();
  await testIndexBook();
  await testFilterByCategory();
  await testCacheByPage();
  await testGetAllCachedBooks();
  console.log('All caching tests completed.');
})();

export {RedisClient};
