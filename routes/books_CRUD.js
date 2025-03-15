import express from 'express';
import {BooksControllers} from '../controllers/index.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.get('/count', async (req, res) => BooksControllers.countRecords(req, res));

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 0; // Extract page from query, default to 0
  const limit = parseInt(req.query.limit) || 10; // Extract limit from query, default to 10
  BooksControllers.homePage(req, res, page, limit); // Pass page and limit to homePage
});

router.get('/:id', async (req, res) => BooksControllers.detailsPage(req, res, req.params.id));

router.post('/:id', authenticate, async (req, res) => BooksControllers.addReview(req, res, req.params.id, {user: req.user, book: req.params.id, comment: req.body.comment, rating: req.body.rating}));

router.delete('/:id/:rid', authenticate, async (req, res) => BooksControllers.deleteReview(req, res, req.params.id, req.params.rid, req.user));

router.patch('/:id/:rid', authenticate, async (req, res) => BooksControllers.updateReview(req, res, req.params.rid, {user: req.user, comment: req.body.comment, rating: req.body.rating}));

export default router;