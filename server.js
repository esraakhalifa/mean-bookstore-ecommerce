import {createServer} from 'node:http';
import process from 'node:process';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import connectDB from './config/db.js';
import passport from './config/passport.js';
import errorHandler from './middlewares/errorHandler.js';
import requestLogger from './middlewares/requestLogger.js';
import router from './routes/index.js';
import {initSocket} from './utils/socketHelper.js';

dotenv.config();
const app = express();
app.use(requestLogger);
const PORT = process.env.PORT || 5000;

const server = createServer(app);

initSocket(server);

app.use(cors({origin: '*', credentials: true}));
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

app.use(router);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
