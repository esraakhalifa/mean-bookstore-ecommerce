import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import {createClient} from 'redis';

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

const client = createClient({
  url: 'redis://localhost:6379' // Default Redis port
});
client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await client.connect();
  console.log('error here');
}

connectRedis();
const data = {
  id: '123',
  title: 'Redis in Action',
  author: 'Josiah L. Carlson',
  price: '25.99'
};
const cacheData = async (data) => {
  try {
    await client.hSet(`user-session:${data.id}`, {
      title: data.title,
      author: data.author,
      price: data.price
    });

    console.log('✅ Data cached in Redis');
  } catch (err) {
    console.error('❌ Error caching data:', err);
  }
};

// const getcachedData = async () => {
//   const allCache = await client.hGetAll('user-session:123');
//   console.log(allCache);
// };

// getcachedData();
cacheData(data);
