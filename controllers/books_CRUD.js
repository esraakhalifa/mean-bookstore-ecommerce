import cache from '../middlewares/cache/bookCache.js';
import Books from '../models/books.js';

const countRecords = async () => {
  const num = await Books.countDocuments({});
  console.log('count api triggered');
  return num;
};

const homePage = async (req) => {
  let page = +req.query.page;
  if (req.query.page === undefined) page = 0;
  if (page < 0 || page > await countRecords() / 10) page = 0;

  const cachedBooks = await cache.getPageCache(page);
  if (cachedBooks) return cachedBooks;
  const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);
  cache.cacheByPage(page, books);
  return books;
};

const bookDetails = async (id) => {
  const book = await Books.findById(id);
  return book;
};
const searchBooks = async (req, res) => {
  try {
    const {title, author, minPrice, maxPrice} = req.query;

    const query = {};

    if (title) {
      query.title = {$regex: title, $options: 'i'};
    }

    if (author) {
      query.authors = {$elemMatch: {$regex: author.trim(), $options: 'i'}};
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number.parseFloat(minPrice);
      if (maxPrice) query.price.$lte = Number.parseFloat(maxPrice);
    }

    // console.log('Search Query:', query);
    const books = await Books.find(query);
    // console.log('Search Results:', books);

    res.json(books);
  } catch (error) {
    res.status(500).json({error: 'Internal server error'});
  }
};

export {
  bookDetails,
  countRecords,
  homePage,
  searchBooks
};
