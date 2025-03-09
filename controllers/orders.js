import Orders from '../models/orders.js';

export const getUserOrders = async (req, res, next) => {
  const {id} = req.params;
  const userOrders = await Orders.find({user: id}).populate('books');
  if (!userOrders) {
    return res.status(404).json({message: 'User has no orders'});
  }
  res.json(userOrders);
};
