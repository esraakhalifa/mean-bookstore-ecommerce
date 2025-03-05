import express from 'express';
import {AuthController} from '../controllers/index.js';

const router = express.Router();

router.get('/login', AuthController.getLogin);
router.get('/signup', AuthController.getSignup);
router.post('/login', AuthController.postLogin);
router.post('/signup', AuthController.postSignup);
router.post('/refresh', AuthController.postRefresh);
router.post('/logout', AuthController.postLogout);
router.get('/verify/:token', AuthController.emailVerify);
export default router;
