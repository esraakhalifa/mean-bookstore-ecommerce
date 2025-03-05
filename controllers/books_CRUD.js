import Books from '../models/books.js';

const countRecords = async () => {
  const num = await Books.countDocuments({});
  return num;
};

const homePage = async (page) => {
  if (page === undefined) page = 0;
  if (page < 0 || page > countRecords() / 10) page = 0;
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
