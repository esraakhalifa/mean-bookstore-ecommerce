import Books from '../models/books.js';
import cache from '../middlewares/cache/bookCache.js'

const countRecords = async () => {
  const num = await Books.countDocuments({});
  return num;
};

const homePage = async (req, res) => {  
  try {
    let page = parseInt(req.query.page, 10) || 0;  

    const total = await Books.countDocuments({});
    const totalPages = Math.ceil(total / 10);

    if (page < 0 || page >= totalPages) {
      return res.status(400).json({ status: 400, message: 'Invalid page number' });
    }

    // Check cache first
    const pageFromCache = await cache.getPageCache(page);
    if (pageFromCache) {
      console.log('Cache hit:', pageFromCache);
      return res.status(200).json({ status: 200, message: 'Books retrieved successfully', books: pageFromCache });
    }

   
    const books = await Books.find({}, 'image title price').skip(page * 10).limit(10);

    
    await cache.cacheByPage(page, books);

    return res.status(200).json({ status: 200, message: 'Books retrieved successfully', books });
  } catch (error) {
    console.error('Error retrieving books:', error);
    return res.status(500).json({ status: 500, message: 'Failed to retrieve books', error: error.message });
  }
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
