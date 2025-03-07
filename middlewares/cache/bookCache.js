import {RedisClient} from '../../server.js';

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

const cacheBooksMiddleware = async (req, res, books, next) => {
  const page = req.query.page || 1;
  const pipeline = RedisClient.multi();
  const bookKeys = [];

  for (const book of books) {
    const bookKey = `book:${book._id.toString()}`;
    pipeline.hSet(bookKey, bookSchemaForCache(book));
    pipeline.expire(bookKey, 3600);
    bookKeys.push(bookKey);
  }

  const pageKey = `books:page_${page}`;
  // pipeline.del(pageKey);
  pipeline.rPush(pageKey, ...bookKeys);
  pipeline.expire(pageKey, 3600);

  await pipeline.exec();
  console.log(`Cached ${books.length} books for page ${page}`);
  next();
};

const getCachedBooksMiddleware = async (req, res, next) => {
  const {page} = req.params; // Assuming page number is in route params
  const pageKey = `books:page_${page}`;

  try {
    const bookKeys = await RedisClient.lRange(pageKey, 0, -1);

    if (!bookKeys.length) {
      console.log(`No cached books found for page ${page}`);
      return next(); // Proceed to fetch from DB if cache is empty
    }

    const pipeline = RedisClient.multi();
    bookKeys.forEach((key) => pipeline.hGetAll(key));

    const books = await pipeline.exec();
    const parsedBooks = books.map(bookSchemaFromCache);

    console.log(`Retrieved ${parsedBooks.length} books from cache for page ${page}`);

    req.cachedBooks = parsedBooks; // Attach to req object
    return next(); // Proceed to controller
  } catch (error) {
    console.error('Error retrieving cached books:', error);
    next(); // Proceed even if Redis fails
  }
};

// const bookCacheMiddleware = async (req, res, next) => {
//   const page = +req.body.params;
//   const pageKey = `book:page_${page}`;
//   const books = await
// };

export {cacheBooksMiddleware, getCachedBooksMiddleware};

/**
 * 1)law la2a fil cache tamam, ml2ahash hy3ml call lel database
 * 2)w b3den a3melo function t-cache elly rege3 y-call it ba3d
 * ma y-retrieve men el database
 * 3)w a3melo function t-update el book fil cache y-call it
 * fil update api
 *
 */
