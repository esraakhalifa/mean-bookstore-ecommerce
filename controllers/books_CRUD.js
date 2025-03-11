import Books from '../models/books.js';
import RedisClient from '../server.js';

const countRecords = async () => {
  const num = await Books.countDocuments({});
  return num;
};

const homePage = async (req) => {
  let page = +req.query.page;
  if (req.query.page === undefined) page = 0;
  if (page < 0 || page > countRecords() / 10) page = 0;
  const cacheKey = `books:page:${page}`;
  const cachedBooks = await RedisClient.hGetAll(cacheKey);
  if (cachedBooks) {
    return JSON.parse(cachedBooks);
  }
  if (req.cachedBooks) return req.cachedBooks;
  const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
  return books;
};

const bookDetails = async (id) => {
  const book = await Books.findById(id);
  return book;
};

export {
  bookDetails,
  countRecords,
  homePage
};
