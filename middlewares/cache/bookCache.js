import RedisClient from '../../server.js';

const createBookKey = (book) => {
  return `book:${book._id.toString()}`;
};

const bookSchemaForCache = (book) => ({
  title: book.title || '',
  authors: JSON.stringify(book.authors || []),
  price: (book.price ?? '').toString(),
  description: book.description || '',
  stock: (book.stock ?? '0').toString(),
  img: book.img || ''
});

const bookSchemaFromCache = (book) => ({
  title: book.title,
  authors: JSON.parse(book.authors),
  price: +book.price,
  description: book.description,
  stock: +book.stock,
  img: book.img
});
const getCachedBook = async (book) => {
  try {
    const bookKey = `book:${book._id.toString()}`;
    const cachedBook = RedisClient.hGetAll(bookKey);
    if (!cachedBook || Object.keys(cachedBook).length === 0) {
      console.log(`No cached book data found for page ${bookKey}`);
      return null;
    }

    return bookSchemaFromCache(cachedBook);
  } catch (error) {
    console.error('Error retrieving cached books:', error);
  }
};
const cacheBook = async (book) => {
  if (!book) {
    console.log('No books to cache.');
    return;
  }

  const bookKey = createBookKey(book);
  const bookData = bookSchemaForCache(book);

  if (!bookData || Object.keys(bookData).length === 0) {
    console.warn(`Skipping empty book data for ${bookKey}`);
  }

  RedisClient.hSet(bookKey, bookData);
  RedisClient.expire(bookKey, 3600);
};

async function indexBook(book) {
  await RedisClient.zadd(`book:price`, book.price, book._id);
  await RedisClient.zadd(`book:rating`, book.rating, book._id);
  await RedisClient.sadd(`book:category:${book.category}`, book._id);
}

const deleteFromCache = async (book) => {
  const bookKey = createBookKey(book);
  await RedisClient.del(bookKey);
  await RedisClient.zrem(`book:price`, book._id);
  await RedisClient.zrem(`book:rating`, book._id);
  // await RedisClient.srem(`books:category:${category}`, book._id);
};

const updateCache = async (book) => {
  try {
    await deleteFromCache(book);
    await cacheBook(book);
    console.log(`Cache updated for book: ${book._id.toString()}`);
  } catch (error) {
    console.error(`Failed to update cache for book: ${book._id.toString()}`, error);
  }
};

async function searchByPrice(min, max) {
  return await RedisClient.zrangebyscore('book:price', min, max);
}

async function filterByCategory(category) {
  return await RedisClient.smembers(`books:category:${category}`);
}
async function updateIndex(book) {
  await RedisClient.zadd(`books:price`, book.price, book._id);
  await RedisClient.zadd(`books:rating`, book.rating, book._id);
  await RedisClient.sadd(`books:category:${book.category}`, book._id);
}
const cacheByPage = async (page, books) => {
  const cacheKey = `books:page:${page}`;

  if (!books || books.length === 0) return;

  // 🔹 Store the books in Redis with a 10-minute expiration time
  await RedisClient.hSet(cacheKey, 600, JSON.stringify(books));

  console.log(`📌 Cached ${books.length} books for page ${page}`);
};

export default {
  bookSchemaFromCache,
  cacheBook,
  createBookKey,
  deleteFromCache,
  filterByCategory,
  getCachedBook,
  indexBook,
  searchByPrice,
  updateCache,
  updateIndex,
  cacheByPage

};
