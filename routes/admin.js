import express from 'express';
import * as AdminController from '../controllers/admin.js';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';

const router = express.Router();

router.get('/users/online', authenticate, authorize('admin'), AdminController.getOnlineUsers);
router.get('/users/:userId/connections', authenticate, authorize('admin'), AdminController.getUserConnections);
router.get('/users/:userId/history', authenticate, authorize('admin'), AdminController.getUserActivityHistory);
router.get('/connections/summary', authenticate, authorize('admin'), AdminController.getAllConnectionsSummary);
router.get('/stats/users', authenticate, authorize('admin'), AdminController.getUserActivityStats);

router.post('/users/disconnect', authenticate, authorize('admin'), AdminController.disconnectUser);
router.post('/notifications/send', authenticate, authorize('admin'), AdminController.sendAdminNotification);
router.post('/system/broadcast', authenticate, authorize('admin'), AdminController.broadcastSystemMessage);

export default router;
