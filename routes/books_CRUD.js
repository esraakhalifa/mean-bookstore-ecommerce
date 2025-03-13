import express from 'express';
import {BooksControllers} from '../controllers/index.js';

const router = express.Router();

router.get('/count', async (req, res) => BooksControllers.countRecords(req, res));
router.get('/', async (req, res) => BooksControllers.homePage(req, res, req.query));
router.get('/book/:id', async (req, res) => BooksControllers.detailsPage(req, res, req.params.id));
router.post('/book/:id', async (req, res) => BooksControllers.addReview(req, res, req.params.id, {user: req.user, book: req.params.id, comment: req.body.comment, rating: req.body.rating}));
router.delete('/book/:id/:rid', async (req, res) => BooksControllers.deleteReview(req, res, req.params.id, req.params.rid, req.user));
router.patch('/book/:id/:rid', async (req, res) => BooksControllers.updateReview(req, res, req.params.rid, {user: req.user, comment: req.body.comment, rating: req.body.rating}));

export default router;
