import express from 'express';
import {AuthController} from '../controllers/index.js';
//import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.get('/auth/google', AuthController.googleAuth);
router.get('/auth/google/callback', AuthController.googleAuthCallback, AuthController.googleAuthSuccess);
router.get('/profile', AuthController.getProfile);
router.get('/login', AuthController.getLogin);
router.get('/signup', AuthController.getSignup);
router.post('/login', AuthController.postLogin);
router.post('/signup', AuthController.postSignup);
router.post('/refresh', AuthController.postRefresh);
router.post('/logout', AuthController.postLogout);
router.get('/verify/:token', AuthController.emailVerify);

export default router;
