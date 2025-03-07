import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import {createClient} from 'redis';
import connectDB from './config/db.js';
import passport from './config/passport.js';
import {cacheBooksByPage, getCachedBooksByPage} from './middlewares/cache/bookCache.js';
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
    cookie: {secure: false} // Set to true if using HTTPS
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
export {RedisClient};
connectRedis();

const dummyBooks = [
  {_id: '1', title: 'Redis for Beginners', authors: ['John Doe'], price: 15.99, description: 'A beginner-friendly guide.', stock: 10, img: 'redis1.jpg'},
  {_id: '2', title: 'Advanced Redis', authors: ['Jane Doe'], price: 25.99, description: 'Deep dive into Redis internals.', stock: 5, img: 'redis2.jpg'}
];

(async () => {
  await cacheBooksByPage(1, dummyBooks);
  const cachedBooks = await getCachedBooksByPage(1).catch((err) => {
    console.log(err);
  });
  console.log('Cached Books:', cachedBooks);
  // await client.quit(); // Close Redis connection
})();
