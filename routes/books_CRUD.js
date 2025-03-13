import express from 'express';
import {BooksControllers} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.get('/count', async (req, res) => res.json(await BooksControllers.countRecords()));
router.get('/', async (req, res) => res.json(await BooksControllers.homePage(req.query.page)));
router.get('/book/:id', async (req, res) => res.json(await BooksControllers.detailsPage(req.params.id)));
router.post('/book/:id', authenticate, async (req, res) => res.json(await BooksControllers.addReview(req.params.id, {user: req.user, book: req.params.id, comment: req.body.comment, rating: req.body.rating})));
router.delete('/book/:id/:rid', authenticate, async (req, res) => res.json(await BooksControllers.deleteReview(req.params.id, req.params.rid, req.user)));
router.patch('/book/:id/:rid', authenticate, async (req, res) => res.json(await BooksControllers.updateReview(req.params.rid, {user: req.user, comment: req.body.comment, rating: req.body.rating})));

export default router;
