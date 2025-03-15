import os from 'node:os';
import process from 'node:process';
import cache from '../middlewares/cache/bookCache.js';
import Books from '../models/books.js';
import Notification from '../models/Notification.js';
import Users from '../models/users.js';
import {getIO, userActivity, users} from '../utils/socketHelper.js';
import { RedisClient } from '../server.js';

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

    const userDetails = await Users.find(
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

function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  return {
    idle: totalIdle,
    total: totalTick
  };
}

export const getSystemHealth = async (req, res) => {
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
    const activeConnections = [...users.entries()].reduce((total, [_, userData]) => {
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
    console.error('Error fetching system health:', error);
    return res.status(500).json({message: 'Failed to fetch system health'});
  }
};

export const getAllUsers = async (req, res) => {
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
  } catch (err) {
    res.status(500).json({message: 'Failed to fetch users', error: err.message});
  }
};

export const getAllBooks = async (req, res) => {
  try {
    const allCachedBooks = await RedisClient.get('allbooks');
    console.log('allCachedBooks from redis:', allCachedBooks);
    if (allCachedBooks) return res.json(JSON.parse(allCachedBooks));
    const books = await Books.find();

    const totalBooks = await Books.countDocuments();
    const allbooks = {books, totalBooks};

    await RedisClient.set('allbooks', JSON.stringify(allbooks), 'EX', 3600);

    return res.json(allbooks);
  } catch (err) {
    console.log('hello from get all books!!');
    res.status(500).json({message: 'Failed to fetch books', error: err.message});
  }
};

export const getBook = async (req, res) => {
  try {
    const {id} = req.params;
    const cachedBook = await cache.getCachedBook(id);
    if (cachedBook) {
      return res.json(cachedBook);
    }
    const book = await Books
      .findById(id)
      .populate('reviews')
      .exec();

    if (!book) {
      return res.status(404).json({message: 'Book not found'});
    }
    await cache.cacheBook(book);
    res.json(book);
  } catch (err) {
    res.status(500).json({message: 'Failed to fetch book', error: err.message});
  }
};

export const deleteBook = async (req, res) => {
  try {
    const {id} = req.params;
    const deletedBook = await Books.findByIdAndDelete(id);
    if (!deletedBook) {
      return res.status(404).json({message: 'Book not found'});
    }
    cache.deleteFromCache(id);
    res.json({message: 'Book deleted successfully'});
  } catch (err) {
    res.status(500).json({message: 'Failed to delete book', error: err.message});
  }
};

export const uploadBook = async (req, res) => {
  try {
    const {title, price, authors, description, stock} = req.body;

    const newBook = new Books({
      title,
      price: Number(price),
      authors: authors ? JSON.parse(authors) : [],
      description,
      stock: stock ? Number(stock) : 0
    });

    const savedBook = await newBook.save();

    await cache.cacheBook(newBook);
    res.status(201).json(savedBook);
  } catch (err) {
    console.error('Error uploading book:', err);
    res.status(500).json({message: 'Failed to upload book', error: err.message});
  }
};

export const updateBook = async (req, res) => {
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
      return res.status(404).json({message: 'Book not found'});
    }
    await cache.updateCache(updatedBook);
    res.json(updatedBook);
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({message: 'Failed to update book', error: err.message});
  }
};

export const deleteUser = async (req, res) => {
  try {
    const {id} = req.params;
    const deletedUser = await Users.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({message: 'User not found'});
    }
    res.json({message: 'User deleted successfully'});
  } catch (err) {
    res.status(500).json({message: 'Failed to delete user', error: err.message});
  }
};
