import Notification from '../models/Notification.js';
import CustomError from '../utils/CustomError.js';
import {notifyUser} from './sockets.js';

export const createNotification = async (req, res, next) => {
  try {
    const {userId, message, type, metadata} = req.body;

    if (!userId || !message || !type) {
      throw new CustomError('Missing required fields', 400);
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
    next(error);
  }
};

export const getUserNotifications = async (req, res, next) => {
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
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {read: true},
      {new: true}
    );

    if (!notification) {
      throw new CustomError('Notification not found', 404);
    }

    return res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
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
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      throw new CustomError('Notification not found', 404);
    }

    return res.status(200).json({message: 'Notification deleted successfully'});
  } catch (error) {
    next(error);
  }
};

export const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const result = await Notification.deleteMany({user: userId});

    return res.status(200).json({
      message: 'All notifications deleted',
      count: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationStats = async (req, res, next) => {
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
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    const count = await Notification.countDocuments({
      user: userId,
      read: false
    });

    return res.status(200).json({count});
  } catch (error) {
    next(error);
  }
};
