import express from 'express';
import {AdminController} from '../controllers/index.js';

import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import uploadMiddleware from '../middlewares/cdn.js';

const router = express.Router();

router.get('/users/online', authenticate, authorize('admin'), AdminController.getOnlineUsers);
router.get('/users/:userId/connections', authenticate, authorize('admin'), AdminController.getUserConnections);
router.get('/users/:userId/history', authenticate, authorize('admin'), AdminController.getUserActivityHistory);
router.get('/connections/summary', authenticate, authorize('admin'), AdminController.getAllConnectionsSummary);
router.get('/stats/users', authenticate, authorize('admin'), AdminController.getUserActivityStats);

router.post('/users/disconnect', authenticate, authorize('admin'), AdminController.disconnectUser);
router.post('/users/:id/disconnect-all', authenticate, authorize('admin'), AdminController.disconnectAllUserInstances);
router.post('/notifications/send', authenticate, authorize('admin'), AdminController.sendAdminNotification);
router.post('/system/broadcast', authenticate, authorize('admin'), AdminController.broadcastSystemMessage);
router.get('/system/health', authenticate, authorize('admin'), AdminController.getSystemHealth);
router.get('/dashboard/stats', authenticate, authorize('admin'), AdminController.getDashboardStats);

router.get('/users', authenticate, authorize('admin'), AdminController.getAllUsers);
router.delete('/users/:id', authenticate, authorize('admin'), AdminController.deleteUser);
router.get('/books', authenticate, authorize('admin'), AdminController.getAllBooks);
router.get('/books/:id', authenticate, authorize('admin'), AdminController.getBook);
router.post('/books', authenticate, authorize('admin'), uploadMiddleware.single('image'), AdminController.uploadBook);
router.put('/books/:id', authenticate, authorize('admin'), uploadMiddleware.single('image'), AdminController.updateBook);
router.delete('/books/:id', authenticate, authorize('admin'), AdminController.deleteBook);

export default router;
