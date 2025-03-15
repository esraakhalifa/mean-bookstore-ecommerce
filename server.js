import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import {createClient} from 'redis';
import connectDB from './config/db.js';
import passport from './config/passport.js';
// import errorHandler from './middlewares/errorHandler.js';
// import requestLogger from './middlewares/requestLogger.js';
import Books from './models/books.js';
import router from './routes/index.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(router);

connectDB();

const RedisClient = createClient({
  url: 'redis://localhost:6379'
});
RedisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await RedisClient.connect();
  console.log('Redis Connected');
}
connectRedis();
async function cacheOnInit() {
  const books = await Books.find();

  const totalBooks = await Books.countDocuments();
  const allbooks = {books, totalBooks};

  await RedisClient.set('allbooks', JSON.stringify(allbooks), 'EX', 3600);
  console.log('populated the cache with all the books');
}
cacheOnInit();
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false} // Set to true if using HTTPS
  })
);

  

app.use(passport.initialize());
app.use(passport.session());

app.use(router);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export {RedisClient};
