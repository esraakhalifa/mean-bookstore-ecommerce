import mongoose from 'mongoose';
import Book from '../models/books.js';
import Notification from '../models/Notification.js';
import Order from '../models/orders.js';
import User from '../models/users.js';
import {notifyAdminsUserOrder, notifyUser} from './sockets.js';

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {user, books, total_price, payment_method} = req.body; // books: [{ bookId, quantity }, ...]

    const userExists = await User.findById(user);
    if (!userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'User not found'});
    }

    const bookIds = books.map((item) => item.bookId);
    const booksToUpdate = await Book.find({_id: {$in: bookIds}}).session(session);

    if (booksToUpdate.length !== bookIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({message: 'One or more books not found'});
    }

    for (const item of books) {
      const book = booksToUpdate.find((b) => b._id.toString() === item.bookId.toString());
      if (book.stock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Insufficient stock for book: ${book.title}`,
          available: book.stock,
          requested: item.quantity
        });
      }
      book.stock -= item.quantity;
      await book.save({session});
    }

    const order = new Order({
      user,
      books: books.map((item) => ({bookId: item.bookId, quantity: item.quantity})),
      total_price,
      payment_method
    });

    const savedOrder = await order.save({session});

    const notification = new Notification({
      user,
      message: 'Your order has been placed successfully',
      type: 'order',
      metadata: {orderId: savedOrder._id, total: total_price}
    });
    await notification.save({session});

    notifyAdminsUserOrder({
      orderId: savedOrder._id,
      userId: user,
      userName: `${userExists.firstName} ${userExists.lastName}`,
      total: total_price,
      createdAt: savedOrder.createdAt
    });

    notifyUser(user, {
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
 //   console.error('Error creating order:', error);
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({message: error.message});
    }
    return res.status(500).json({message: 'Failed to create order'});
  }
};

export const getOrders = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.user) filter.user = req.query.user;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payment_method) filter.payment_method = req.query.payment_method;
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
      .populate('books.bookId', 'title price')
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      orders,
      pagination: {total, page, limit, pages}
    });
  } catch (error) {
 //   console.error('Error fetching orders:', error);
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
    //console.error('Error fetching order:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(404).json({message: 'User not found'});
    }
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
//    console.error('Error fetching user orders:', error);
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

      notifyUser(order.user._id, {
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
 //   console.error('Error updating order:', error);
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

    notifyUser(order.user, {
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
//    console.error('Error deleting order:', error);
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
 //   console.error('Error fetching popular books:', error);
    return res.status(500).json({message: 'Internal server error'});
  }
};
