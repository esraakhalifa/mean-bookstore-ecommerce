import mongoose from 'mongoose';
import Book from '../models/books.js';
import Notification from '../models/Notification.js';
import Order from '../models/orders.js';
import User from '../models/users.js';
import {getIO} from '../utils/socketHelper.js';

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {user, books, total_price, payment_method} = req.body;

    const userExists = await User.findById(user);
    if (!userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'User not found'});
    }

    const bookIds = books;
    const booksToUpdate = await Book.find({_id: {$in: bookIds}});

    if (booksToUpdate.length !== bookIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'One or more books not found'});
    }

    for (const book of booksToUpdate) {
      const count = bookIds.filter((id) => id.toString() === book._id.toString()).length;

      if (book.stock < count) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Insufficient stock for book: ${book.title}`,
          available: book.stock,
          requested: count
        });
      }

      book.stock -= count;
      await book.save({session});
    }

    const order = new Order({
      user,
      books: bookIds,
      total_price,
      payment_method
    });

    const savedOrder = await order.save({session});

    const notification = new Notification({
      user,
      message: 'Your order has been placed successfully',
      type: 'order',
      metadata: {
        orderId: savedOrder._id,
        total: total_price
      }
    });

    await notification.save({session});

    const io = getIO();
    io.to('admin-channel').emit('new-order', {
      orderId: savedOrder._id,
      userId: user,
      userName: `${userExists.firstName} ${userExists.lastName}`,
      total: total_price,
      createdAt: savedOrder.createdAt
    });

    io.to(`user-${user}`).emit('notification', {
      id: notification._id,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata,
      createdAt: notification.createdAt
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(savedOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating order:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getOrders = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.user) {
      filter.user = req.query.user;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const total = await Order.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const orders = await Order.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('books', 'title price')
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      orders,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName email profile')
      .populate('books', 'title price img');

    if (!order) {
      return res.status(404).json({message: 'Order not found'});
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Order.countDocuments({user: userId});
    const pages = Math.ceil(total / limit);

    const orders = await Order.find({user: userId})
      .populate('books', 'title price img')
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      orders,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const updateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.id;
    const {status, payment_method} = req.body;

    const order = await Order.findById(orderId).populate('user', 'firstName lastName');

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'Order not found'});
    }

    if (status) {
      order.status = status;
    }

    if (payment_method) {
      order.payment_method = payment_method;
    }

    const updatedOrder = await order.save({session});

    if (status) {
      const notification = new Notification({
        user: order.user._id,
        message: `Your order #${order._id} status has been updated to ${status}`,
        type: 'order',
        metadata: {
          orderId: order._id,
          status
        }
      });

      await notification.save({session});

      const io = getIO();
      io.to(`user-${order.user._id}`).emit('notification', {
        id: notification._id,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata,
        createdAt: notification.createdAt
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(updatedOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating order:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'Order not found'});
    }

    for (const bookId of order.books) {
      const book = await Book.findById(bookId);
      if (book) {
        book.stock += 1;
        await book.save({session});
      }
    }

    await Order.findByIdAndDelete(orderId, {session});

    const notification = new Notification({
      user: order.user,
      message: `Your order #${order._id} has been cancelled`,
      type: 'order',
      metadata: {
        orderId: order._id
      }
    });

    await notification.save({session});

    const io = getIO();
    io.to(`user-${order.user}`).emit('notification', {
      id: notification._id,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata,
      createdAt: notification.createdAt
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({message: 'Order deleted successfully'});
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting order:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {$sum: '$total_price'}
        }
      }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: {$sum: 1}
        }
      }
    ]);

    const ordersByPaymentMethod = await Order.aggregate([
      {
        $group: {
          _id: '$payment_method',
          count: {$sum: 1}
        }
      }
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrders = await Order.countDocuments({
      createdAt: {$gte: sevenDaysAgo}
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersByDay = await Order.aggregate([
      {
        $match: {
          createdAt: {$gte: thirtyDaysAgo}
        }
      },
      {
        $group: {
          _id: {
            year: {$year: '$createdAt'},
            month: {$month: '$createdAt'},
            day: {$dayOfMonth: '$createdAt'}
          },
          count: {$sum: 1},
          revenue: {$sum: '$total_price'}
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1
        }
      }
    ]);

    return res.status(200).json({
      totalOrders,
      totalRevenue,
      recentOrders,
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      ordersByPaymentMethod: ordersByPaymentMethod.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      ordersByDay
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getPopularBooks = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 10;

    const popularBooks = await Order.aggregate([
      {$unwind: '$books'},
      {
        $group: {
          _id: '$books',
          count: {$sum: 1}
        }
      },
      {
        $sort: {count: -1}
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      {
        $unwind: '$bookDetails'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          title: '$bookDetails.title',
          price: '$bookDetails.price',
          authors: '$bookDetails.authors',
          image: '$bookDetails.image'
        }
      }
    ]);

    return res.status(200).json(popularBooks);
  } catch (error) {
    console.error('Error fetching popular books:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getCustomerPurchaseHistory = async (req, res) => {
  try {
    const userId = req.params.userId;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({message: 'User not found'});
    }

    const purchasedBooks = await Order.aggregate([
      {
        $match: {user: mongoose.Types.ObjectId(userId)}
      },
      {
        $unwind: '$books'
      },
      {
        $group: {
          _id: '$books',
          count: {$sum: 1},
          lastPurchased: {$max: '$createdAt'}
        }
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      {
        $unwind: '$bookDetails'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          lastPurchased: 1,
          title: '$bookDetails.title',
          price: '$bookDetails.price',
          authors: '$bookDetails.authors',
          image: '$bookDetails.image'
        }
      },
      {
        $sort: {lastPurchased: -1}
      }
    ]);

    const totalSpentResult = await Order.aggregate([
      {
        $match: {user: mongoose.Types.ObjectId(userId)}
      },
      {
        $group: {
          _id: null,
          totalSpent: {$sum: '$total_price'},
          orderCount: {$sum: 1}
        }
      }
    ]);

    const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].totalSpent : 0;
    const orderCount = totalSpentResult.length > 0 ? totalSpentResult[0].orderCount : 0;

    return res.status(200).json({
      user: {
        id: userExists._id,
        name: `${userExists.firstName} ${userExists.lastName}`,
        email: userExists.email
      },
      purchaseStats: {
        totalSpent,
        orderCount,
        booksPurchasedCount: purchasedBooks.length,
        uniqueBooksPurchasedCount: purchasedBooks.length
      },
      purchasedBooks
    });
  } catch (error) {
    console.error('Error fetching customer purchase history:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};
