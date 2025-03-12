import express from 'express';
import * as NotificationController from '../controllers/notifications.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.get('/user/:userId', authenticate, NotificationController.getUserNotifications);
router.put('/:id/read', authenticate, NotificationController.markAsRead);
router.put('/user/:userId/read-all', authenticate, NotificationController.markAllAsRead);
router.delete('/:id', authenticate, NotificationController.deleteNotification);
router.delete('/user/:userId', authenticate, NotificationController.deleteAllNotifications);

router.post('/', authenticate, NotificationController.createNotification);
router.get('/stats', authenticate, NotificationController.getNotificationStats);

router.get('/user/:userId/unread-count', authenticate, NotificationController.getUnreadCount);

export default router;
