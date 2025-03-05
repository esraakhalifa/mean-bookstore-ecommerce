import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  message: {type: String, required: true},
  type: {
    type: String,
    enum: ['order', 'stock', 'system', 'inventory'],
    required: true
  },
  read: {type: Boolean, default: false},
  metadata: {type: Object}
}, {timestamps: true});

export default mongoose.model('Notification', notificationSchema);
