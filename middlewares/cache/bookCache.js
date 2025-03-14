import {RedisClient} from '../../server.js';

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
const getCachedBook = async (id) => {
  try {
    const bookKey = `book:${id.toString()}`;
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
  try {
    if (!book) {
      console.log('No books to cache.');
      return;
    }

    const bookKey = createBookKey(book);
    const bookData = bookSchemaForCache(book);

    if (!bookData || Object.keys(bookData).length === 0) {
      console.warn(`Skipping empty book data for ${bookKey}`);
    }
    console.log(`Caching: ${bookKey}`);
    await RedisClient.hSet(bookKey, bookData);
  } catch (error) {
    console.error('Error caching book:', error);
  }
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
  await RedisClient.zrem(`book:rate`, book._id);
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

  await RedisClient.del(cacheKey);

  for (const book of books) {
    const bookKey = createBookKey(book);

    await RedisClient.hSet(bookKey, bookSchemaForCache(book));
    await RedisClient.rPush(cacheKey, bookKey);
  }
};

const getPageCache = async (page) => {
  try {
    const cacheKey = `books:page:${page}`;
    const cachedReferences = await RedisClient.lRange(cacheKey, 0, -1);

    if (!cachedReferences || cachedReferences.length === 0) return null;

    const cachedBooks = [];
    for (const ref of cachedReferences) {
      const bookData = await RedisClient.hGetAll(ref);

      if (Object.keys(bookData).length > 0) {
        cachedBooks.push(bookSchemaFromCache(bookData));
      } else {
        console.warn(`⚠️ No data found for reference: ${ref}`);
      }
    }

    return cachedBooks.length > 0 ? cachedBooks : null;
  } catch (error) {
    console.error(`Error retrieving books from cache for page ${page}:`, error);
  }
};

const getAllCachedBooks = async () => {
  try {
    const keys = await RedisClient.keys('book:*');
    if (!keys.length) return [];
    console.log('Books are retrieved from cache.');
    const allBooks = [];

    for (const key of keys) {
      const cachedBook = await RedisClient.hGetAll(key);
      if (cachedBook && Object.keys(cachedBook).length > 0) {
        allBooks.push(bookSchemaFromCache(cachedBook));
      }
    }
    
    return allBooks;
  } catch (error) {
    console.error('Error retrieving cached books:', error);
    return [];
  }
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
  cacheByPage,
  getPageCache,
  getAllCachedBooks

};
