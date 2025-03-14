import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import {createClient} from 'redis';
import connectDB from './config/db.js';
import passport from './config/passport.js';
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

const RedisClient = createClient({
  url: 'redis://localhost:6379'
});
RedisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
  await RedisClient.connect();
  console.log('Redis Connected');
}
connectRedis();

app.use(passport.initialize());
app.use(passport.session());

app.use(router);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});




export  default {RedisClient};


