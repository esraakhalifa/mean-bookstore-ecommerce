import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  createdAt: {type: Date, default: Date.now},
  expiresAt: {type: Date, required: true}
});

refreshTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

export default mongoose.model('RefreshToken', refreshTokenSchema);
