import {RedisClient} from '../../server.js';

const getCachedBook = async (id) => {
  try {
    const bookKey = `book:${id}`;
    const cachedBook = await RedisClient.get(bookKey);
    console.log('cached book:', cachedBook);
    if (!cachedBook || Object.keys(cachedBook).length === 0) {
      console.log(`No cached book data found for ${bookKey}`);
      return null;
    }
    return JSON.parse(cachedBook);
  } catch (error) {
    console.error('Error retrieving cached books:', error);
  }
};
const cacheBook = async (book) => {
  try {
    if (!book) {
      console.log('No books to cache.');
      return;
    }
    const bookKey = `book:${book._id}`;
    if (!JSON.stringify(book) || Object.keys(JSON.stringify(book)).length === 0) {
      console.warn(`Skipping empty book data for ${bookKey}`);
    }

    await RedisClient.set(bookKey, JSON.stringify(book), 'EX', 3600);
    const allCachedBooks = await RedisClient.get('allbooks');
    if (allCachedBooks) {
      const allParsedCachedBooks = JSON.parse(allCachedBooks);
      allParsedCachedBooks.books.push(book);
      allParsedCachedBooks.totalBooks++;
      RedisClient.set('allbooks', JSON.stringify(allParsedCachedBooks), 'EX', 3600);
    }
  } catch (error) {
    console.error('Error caching book:', error);
  }
};

const deleteFromCache = async (id) => {
  const bookKey = `book:${id}`;
  await RedisClient.del(bookKey);
  const allCachedBooks = await RedisClient.get('allbooks');
  if (allCachedBooks) {
    const allParsedCachedBooks = JSON.parse(allCachedBooks);
    allParsedCachedBooks.books = allParsedCachedBooks.books.filter((b) => b._id !== id);
    allParsedCachedBooks.totalBooks--;
    RedisClient.set('allbooks', JSON.stringify(allParsedCachedBooks), 'EX', 3600);
  }
};

const updateCache = async (book) => {
  try {
    const bookKey = `book:${book._id}`;
    await RedisClient.set(bookKey, JSON.stringify(book), 'EX', 3600);
    const allCachedBooks = await RedisClient.get('allbooks');
    if (allCachedBooks) {
      const allParsedCachedBooks = JSON.parse(allCachedBooks);
      allParsedCachedBooks.books = allParsedCachedBooks.books.map((b) => {
        if (b._id == book._id) {
          return book;
        } else {
          return b;
        }
      });
      await RedisClient.set('allbooks', JSON.stringify(allParsedCachedBooks), 'EX', 3600);
    }
  } catch (error) {
    console.error(`Failed to update cache for book: ${book._id.toString()}`, error);
  }
};
const cacheByPage = async (page, books) => {
  if (!books || books.length === 0) return;
  let pageVal = parseInt(page);
  console.log(pageVal);
  const cacheKey = `books:page:${pageVal}`;
  await RedisClient.set(cacheKey, JSON.stringify(books), 'EX', 3600);
};

const getPageCache = async (page) => {
  try {
    const cacheKey = `books:page:${page}`;
    console.log()
    const cachedBooks = await RedisClient.get(cacheKey);

    return cachedBooks ? JSON.parse(cachedBooks) : null;
  } catch (error) {
    console.error(`Error retrieving books from cache for page ${page}:`, error);
    return null;
  }
};

export default {
  cacheBook,
  deleteFromCache,
  getCachedBook,
  updateCache,
  cacheByPage,
  getPageCache
};
