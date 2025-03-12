import process from 'node:process';
import Notification from '../models/Notification.js';
import User from '../models/users.js';
import {getIO, userActivity, users} from '../utils/socketHelper.js';

export const getOnlineUsers = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userIds = [...users.keys()];

    const onlineUserIds = userIds.filter((userId) =>
      users.get(userId).sockets.size > 0
    );

    if (onlineUserIds.length === 0) {
      return res.status(200).json({
        users: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0
        }
      });
    }

    const total = onlineUserIds.length;
    const pages = Math.ceil(total / limit);

    const paginatedUserIds = onlineUserIds.slice(skip, skip + limit);

    const userDetails = await User.find(
      {_id: {$in: paginatedUserIds}},
      'firstName lastName email role'
    );

    const onlineUsers = userDetails.map((user) => {
      const userId = user._id.toString();
      const status = userActivity.has(userId) ? userActivity.get(userId).status : 'unknown';

      return {
        userId,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        connections: users.get(userId).sockets.size,
        status,

        ...(req.query.detailed === 'true' && {
          lastActive: userActivity.has(userId) ? userActivity.get(userId).lastActive : null
        })
      };
    });

    return res.status(200).json({
      users: onlineUsers,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUserActivityStats = async (req, res) => {
  try {
    const onlineUsersCount = [...users.entries()].filter(
      ([_, userData]) => userData.sockets.size > 0
    ).length;

    const totalUsers = await User.countDocuments();

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: {$sum: 1}
        }
      }
    ]);

    const statusCounts = {
      online: 0,
      away: 0,
      busy: 0,
      offline: 0
    };

    for (const [, activity] of userActivity.entries()) {
      if (activity.status && statusCounts[activity.status] !== undefined) {
        statusCounts[activity.status]++;
      }
    }

    return res.status(200).json({
      totalUsers,
      onlineUsers: onlineUsersCount,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      statusCounts
    });
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUserConnections = async (req, res) => {
  try {
    const userId = req.params.userId;
    const detailed = req.query.detailed === 'true';

    if (!users.has(userId)) {
      return res.status(404).json({message: 'User not found'});
    }

    const userData = users.get(userId);

    if (userData.sockets.size === 0) {
      return res.status(404).json({message: 'User is not online'});
    }

    const connections = [];

    for (const [socketId, metadata] of userData.sockets.entries()) {
      connections.push({
        socketId,
        device: metadata.device || 'unknown',

        ...(detailed && {
          browser: metadata.browser || 'unknown',
          ip: metadata.ip || 'unknown',
          connectedAt: metadata.connectedAt || new Date()
        })
      });
    }

    return res.status(200).json(connections);
  } catch (error) {
    console.error('Error fetching user connections:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUserActivityHistory = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!users.has(userId)) {
      return res.status(404).json({message: 'User not found'});
    }

    const userData = users.get(userId);
    const status = userActivity.has(userId) ? userActivity.get(userId).status : 'unknown';
    const lastActive = userActivity.has(userId) ? userActivity.get(userId).lastActive : null;

    return res.status(200).json({
      history: userData.history || [],
      currentConnections: Array.from(userData.sockets.values()),
      status,
      lastActive
    });
  } catch (error) {
    console.error('Error fetching user activity history:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const disconnectUser = async (req, res) => {
  try {
    const {userId, socketId} = req.body;
    const io = getIO();

    if (!userId || !socketId) {
      return res.status(400).json({message: 'User ID and Socket ID are required'});
    }

    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
      return res.status(404).json({message: 'Socket connection not found'});
    }

    socket.disconnect(true);

    return res.status(200).json({message: 'User disconnected successfully'});
  } catch (error) {
    console.error('Error disconnecting user:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getAllConnectionsSummary = async (req, res) => {
  try {
    const summary = {
      totalConnections: 0,
      deviceTypes: {},
      browsers: {},
      connectionsByRole: {}
    };

    const onlineUserIds = [...users.keys()].filter((userId) =>
      users.get(userId).sockets.size > 0
    );

    if (onlineUserIds.length === 0) {
      return res.status(200).json(summary);
    }

    const userDetails = await User.find(
      {_id: {$in: onlineUserIds}},
      'role'
    );

    const userRoles = {};
    userDetails.forEach((user) => {
      userRoles[user._id.toString()] = user.role;
    });

    for (const userId of onlineUserIds) {
      const userData = users.get(userId);
      const role = userRoles[userId] || 'unknown';

      if (!summary.connectionsByRole[role]) {
        summary.connectionsByRole[role] = 0;
      }
      summary.connectionsByRole[role] += userData.sockets.size;

      summary.totalConnections += userData.sockets.size;

      for (const [, metadata] of userData.sockets.entries()) {
        const device = metadata.device || 'unknown';
        const browser = metadata.browser || 'unknown';

        if (!summary.deviceTypes[device]) {
          summary.deviceTypes[device] = 0;
        }
        summary.deviceTypes[device]++;

        if (!summary.browsers[browser]) {
          summary.browsers[browser] = 0;
        }
        summary.browsers[browser]++;
      }
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching connections summary:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const broadcastSystemMessage = async (req, res) => {
  try {
    const {message, type} = req.body;
    const io = getIO();

    if (!message || !type) {
      return res.status(400).json({message: 'Message and type are required'});
    }

    io.emit('system-message', {
      message,
      type,
      timestamp: new Date()
    });

    return res.status(200).json({
      message: 'System message broadcast successfully'
    });
  } catch (error) {
    console.error('Error broadcasting system message:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const activeConnections = [...users.entries()].reduce((total, [_, userData]) => {
      return total + userData.sockets.size;
    }, 0);

    const memoryUsage = process.memoryUsage();

    const uptime = process.uptime();

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const activeUsers = [...userActivity.entries()].filter(([_, activity]) => {
      return activity.lastActive >= oneHourAgo;
    }).length;

    return res.status(200).json({
      activeConnections,
      activeUsers,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      uptime: {
        seconds: Math.round(uptime),
        minutes: Math.round(uptime / 60),
        hours: Math.round(uptime / 60 / 60),
        days: Math.round(uptime / 60 / 60 / 24)
      }
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const disconnectAllUserInstances = async (req, res) => {
  try {
    const {userId} = req.body;
    const io = getIO();

    if (!userId) {
      return res.status(400).json({message: 'User ID is required'});
    }

    if (!users.has(userId)) {
      return res.status(404).json({message: 'User not found or not connected'});
    }

    const userData = users.get(userId);
    const socketIds = [...userData.sockets.keys()];

    if (socketIds.length === 0) {
      return res.status(404).json({message: 'User has no active connections'});
    }

    for (const socketId of socketIds) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }

    return res.status(200).json({
      message: 'User disconnected successfully',
      disconnectedSockets: socketIds.length
    });
  } catch (error) {
    console.error('Error disconnecting user:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const sendAdminNotification = async (req, res) => {
  try {
    const {userIds, message, type} = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !message || !type) {
      return res.status(400).json({message: 'User IDs array, message and type are required'});
    }

    const notifications = userIds.map((userId) => ({
      user: userId,
      message,
      type,
      metadata: {source: 'admin'},
      read: false
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    const io = getIO();
    createdNotifications.forEach((notification) => {
      io.to(`user-${notification.user}`).emit('notification', {
        id: notification._id,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata,
        createdAt: notification.createdAt
      });
    });

    return res.status(201).json({
      message: 'Notifications sent successfully',
      count: createdNotifications.length
    });
  } catch (error) {
    console.error('Error sending admin notifications:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};
