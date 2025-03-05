/* eslint-disable node/prefer-global/process */
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import router from './routes/index.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());
app.use(router);

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
