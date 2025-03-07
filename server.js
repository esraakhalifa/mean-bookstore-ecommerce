import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import {createClient} from 'redis';
import {cacheBooksByPage, getCachedBooksByPage} from './middlewares/cache/bookCache.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

app.get('/', (req, res) => {
  res.send('Server Home');
});

app.listen(PORT, () => {
  console.log(`Server is running on  http://localhost:${PORT}`);
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
