import express from 'express';
import {BooksControllers} from '../controllers/index.js';

const router = express.Router();

router.get('/count', async (req, res) => res.json(await BooksControllers.countRecords()));
router.get('/', async (req, res) => res.json(await BooksControllers.homePage(req.query.page)));
router.get('/book/:id', async (req, res) => res.json(await BooksControllers.bookDetails(req.params.id)));

export default router;
