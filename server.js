import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import connectDB from './config/db.js';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.use('/', authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
