import os from 'node:os';
import process from 'node:process';
import Books from '../models/books.js';
import Notification from '../models/Notification.js';
import Orders from '../models/orders.js';
import Users from '../models/users.js';
import CustomError from '../utils/CustomError.js';
import {getIO, userActivity, usersData} from '../utils/socketHelper.js';

export const getOnlineUsers = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userIds = [...usersData.keys()];

    const onlineUserIds = userIds.filter((userId) =>
      usersData.get(userId).sockets.size > 0
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

    const userDetails = await Users.find(
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
        connections: usersData.get(userId).sockets.size,
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
    next(new CustomError('Failed to fetch online users', 500));
  }
};

export const getUserActivityStats = async (req, res, next) => {
  try {
    const onlineUsersCount = [...usersData.entries()].filter(
      ([_, userData]) => userData.sockets.size > 0
    ).length;

    const totalUsers = await Users.countDocuments();

    const usersByRole = await Users.aggregate([
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
    next(new CustomError('Failed to fetch user activity stats', 500));
  }
};

export const getUserConnections = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const detailed = req.query.detailed === 'true';

    if (!usersData.has(userId)) {
      throw new CustomError('User not found', 404);
    }

    const userData = usersData.get(userId);

    if (userData.sockets.size === 0) {
      throw new CustomError('User is not online', 404);
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
    next(error);
  }
};

export const getUserActivityHistory = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!usersData.has(userId)) {
      throw new CustomError('User not found', 404);
    }

    const userData = usersData.get(userId);
    const status = userActivity.has(userId) ? userActivity.get(userId).status : 'unknown';
    const lastActive = userActivity.has(userId) ? userActivity.get(userId).lastActive : null;

    return res.status(200).json({
      history: userData.history || [],
      currentConnections: Array.from(userData.sockets.values()),
      status,
      lastActive
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectUser = async (req, res, next) => {
  try {
    const {userId, socketId} = req.body;
    const io = getIO();

    if (!userId || !socketId) {
      throw new CustomError('User ID and Socket ID are required', 400);
    }

    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
      throw new CustomError('Socket connection not found', 404);
    }

    socket.disconnect(true);

    return res.status(200).json({message: 'User disconnected successfully'});
  } catch (error) {
    next(error);
  }
};

export const getAllConnectionsSummary = async (req, res, next) => {
  try {
    const summary = {
      totalConnections: 0,
      deviceTypes: {},
      browsers: {},
      connectionsByRole: {}
    };

    const onlineUserIds = [...usersData.keys()].filter((userId) =>
      usersData.get(userId).sockets.size > 0
    );

    if (onlineUserIds.length === 0) {
      return res.status(200).json(summary);
    }

    const userDetails = await Users.find(
      {_id: {$in: onlineUserIds}},
      'role'
    );

    const userRoles = {};
    userDetails.forEach((user) => {
      userRoles[user._id.toString()] = user.role;
    });

    for (const userId of onlineUserIds) {
      const userData = usersData.get(userId);
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
    next(new CustomError('Failed to fetch connections summary', 500));
  }
};

export const broadcastSystemMessage = async (req, res, next) => {
  try {
    const {message, type} = req.body;
    const io = getIO();

    if (!message || !type) {
      throw new CustomError('Message and type are required', 400);
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
    next(error);
  }
};

export const disconnectAllUserInstances = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const io = getIO();

    if (!userId) {
      throw new CustomError('User ID is required', 400);
    }

    if (!usersData.has(userId)) {
      throw new CustomError('User not found or not connected', 404);
    }

    const userData = usersData.get(userId);
    const socketIds = [...userData.sockets.keys()];

    if (socketIds.length === 0) {
      throw new CustomError('User has no active connections', 404);
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
    next(error);
  }
};

export const sendAdminNotification = async (req, res, next) => {
  try {
    const {userId, message, type} = req.body;

    if (!userId || !message || !type) {
      throw new CustomError('User IDs array, message and type are required', 400);
    }

    const notificationTypes = ['order', 'stock', 'system', 'inventory'];
    if (!notificationTypes.includes(type)) {
      throw new CustomError('Invalid notification type', 400);
    }

    const notification = {
      user: userId,
      message,
      type,
      metadata: {source: 'admin'},
      read: false
    };

    const createdNotifications = await Notification.insertMany(notification);

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
    next(error);
  }
};

export const getSystemHealth = async (req, res, next) => {
  try {
    // System memory details
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Process memory usage
    const processMemory = process.memoryUsage();

    // Uptime details
    const systemUptime = os.uptime();
    const processUptime = process.uptime();

    // Example: Active connections (assuming a Map of users and their sockets)
    const activeConnections = [...usersData.entries()].reduce((total, [_, userData]) => {
      return total + userData.sockets.size;
    }, 0);

    // Example: Active users in the last hour (assuming a userActivity Map)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsers = [...userActivity.entries()].filter(([_, activity]) => {
      return activity.lastActive >= oneHourAgo;
    }).length;

    // CPU Usage calculation (take two samples with a small delay)
    const startUsage = getCpuUsage();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
    const endUsage = getCpuUsage();

    const idleDiff = endUsage.idle - startUsage.idle;
    const totalDiff = endUsage.total - startUsage.total;
    const cpuUsagePercentage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;

    // Response with system health data
    return res.status(200).json({
      uptime: systemUptime,
      memory: {
        used: usedMemory,
        total: totalMemory
      },
      process: {
        memory: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external
        },
        uptime: processUptime,
        pid: process.pid
      },
      cpu: {
        usage: cpuUsagePercentage.toFixed(2), // CPU usage as a percentage
        cores: os.cpus().length // Number of CPU cores
      },
      versions: {
        node: process.version
      },
      env: process.env.NODE_ENV || 'development',
      activeConnections,
      activeUsers
    });
  } catch (error) {
    next(new CustomError('Failed to fetch system health', 500));
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    // Get business statistics
    const totalUsers = await Users.countDocuments();
    const totalBooks = await Books.countDocuments();
    const totalOrders = await Orders.countDocuments();
    const revenueResult = await Orders.aggregate([
      {$group: {_id: null, total: {$sum: '$amount'}}}
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Get recent orders (last 5)
    const recentOrders = await Orders.find()
      .sort({createdAt: -1})
      .limit(5)
      .populate('user', 'name email');

    // Get system health metrics (from your existing getSystemHealth function)
    const systemMetrics = await getSystemHealthMetrics();

    res.json({
      totalUsers,
      totalBooks,
      totalOrders,
      totalRevenue,
      recentOrders,
      systemMetrics
    });
  } catch (error) {
    next(new CustomError('Failed to fetch dashboard stats', 500));
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        {name: {$regex: search, $options: 'i'}},
        {email: {$regex: search, $options: 'i'}}
      ];
    }

    const total = await Users.countDocuments(query);
    const users = await Users.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(new CustomError('Failed to fetch users', 500));
  }
};

export const getAllBooks = async (req, res, next) => {
  try {
    const books = await Books.find();
    const totalBooks = await Books.countDocuments();
    res.json({books, totalBooks});
  } catch (error) {
    next(new CustomError('Failed to fetch books', 500));
  }
};

export const getBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    const book = await Books
      .findById(id)
      .populate('reviews')
      .exec();

    if (!book) {
      throw new CustomError('Book not found', 404);
    }

    res.json(book);
  } catch (error) {
    next(error);
  }
};

export const deleteBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    const deletedBook = await Books.findByIdAndDelete(id);
    if (!deletedBook) {
      throw new CustomError('Book not found', 404);
    }
    res.json({message: 'Book deleted successfully'});
  } catch (error) {
    next(error);
  }
};

export const uploadBook = async (req, res, next) => {
  try {
    const {title, price, authors, description, stock, img} = req.body;

    const imageUrl = req.file ? req.file.path : (img || null);

    const newBook = new Books({
      title,
      price: Number(price),
      authors: authors ? JSON.parse(authors) : [],
      description,
      stock: stock ? Number(stock) : 0,
      img: imageUrl
    });

    const savedBook = await newBook.save();
    console.log('Book saved successfully:', savedBook);

    res.status(201).json(savedBook);
  } catch (error) {
    next(new CustomError('Failed to upload book', 500));
  }
};

export const updateBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {title, price, authors, description, stock, img} = req.body;

    const imageUrl = req.file ? req.file.path : (img || null);

    const updateData = {
      title,
      price: Number(price),
      description,
      stock: Number(stock)
    };

    if (authors) updateData.authors = JSON.parse(authors);
    if (imageUrl) updateData.img = imageUrl;

    const updatedBook = await Books.findByIdAndUpdate(
      id,
      updateData,
      {new: true}
    );

    if (!updatedBook) {
      throw new CustomError('Book not found', 404);
    }

    res.json(updatedBook);
  } catch (error) {
    next(new CustomError('Failed to update book', 500));
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const {id} = req.params;
    const deletedUser = await Users.findByIdAndDelete(id);
    if (!deletedUser) {
      throw new CustomError('User not found', 404);
    }
    res.json({message: 'User deleted successfully'});
  } catch (error) {
    next(error);
  }
};
