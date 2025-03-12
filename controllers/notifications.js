import Notification from '../models/Notification.js';
import {notifyUser} from './sockets.js';

export const createNotification = async (req, res) => {
  try {
    const {userId, message, type, metadata} = req.body;

    if (!userId || !message || !type) {
      return res.status(400).json({message: 'Missing required fields'});
    }

    const notification = new Notification({
      user: userId,
      message,
      type,
      metadata: metadata || {},
      read: false
    });

    await notification.save();

    notifyUser(userId, {
      id: notification._id,
      message,
      type,
      metadata: notification.metadata,
      createdAt: notification.createdAt
    });

    return res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;
    const {page = 1, limit = 10, read} = req.query;

    const query = {user: userId};

    if (read !== undefined) {
      query.read = read === 'true';
    }

    const options = {
      sort: {createdAt: -1},
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      limit: Number.parseInt(limit)
    };

    const notifications = await Notification.find(query, null, options);
    const total = await Notification.countDocuments(query);

    return res.status(200).json({
      notifications,
      totalPages: Math.ceil(total / Number.parseInt(limit)),
      currentPage: Number.parseInt(page),
      totalNotifications: total
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {read: true},
      {new: true}
    );

    if (!notification) {
      return res.status(404).json({message: 'Notification not found'});
    }

    return res.status(200).json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await Notification.updateMany(
      {user: userId, read: false},
      {read: true}
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({message: 'Notification not found'});
    }

    return res.status(200).json({message: 'Notification deleted successfully'});
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await Notification.deleteMany({user: userId});

    return res.status(200).json({
      message: 'All notifications deleted',
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getNotificationStats = async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: {$sum: 1},
          readCount: {
            $sum: {$cond: ['$read', 1, 0]}
          },
          unreadCount: {
            $sum: {$cond: ['$read', 0, 1]}
          }
        }
      }
    ]);

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.params.userId;

    const count = await Notification.countDocuments({
      user: userId,
      read: false
    });

    return res.status(200).json({count});
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};
