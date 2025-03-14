import process from 'node:process';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import RefreshToken from '../models/refreshToken.js';
import CustomError from '../utils/CustomError.js';

const generateTokens = async (user) => {
  try {
    const accessToken = jwt.sign(
      {userId: user._id, email: user.email, role: user.role},
      process.env.ACCESS_TOKEN_SECRET,
      {expiresIn: '1h'}
    );

    const refreshToken = jwt.sign(
      {userId: user._id, email: user.email, role: user.role},
      process.env.REFRESH_TOKEN_SECRET,
      {expiresIn: '7d'}
    );

    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    return {AccessToken: accessToken, RefreshToken: refreshToken};
  } catch (error) {
    throw new CustomError('Failed to generate tokens', 500, {error});
  }
};

const refreshToken = async (token) => {
  try {
    const storedToken = await RefreshToken.findOne({token});
    if (!storedToken) {
      throw new CustomError('Invalid refresh token', 401);
    }

    const userInfo = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    await RefreshToken.deleteOne({token});

    const tokens = await generateTokens(userInfo);
    return tokens;
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new CustomError('Invalid or expired refresh token', 401);
    }
    throw new CustomError('Failed to refresh token', 500, {error});
  }
};

const removeRefreshToken = async (refreshToken) => {
  try {
    await RefreshToken.deleteOne({refreshToken});
  } catch (error) {
    throw new CustomError('Failed to remove refresh token', 500, {error});
  }
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (user) => {
  try {
    const token = jwt.sign(
      {userId: user._id, email: user.email, role: user.role},
      process.env.ACCESS_TOKEN_SECRET,
      {expiresIn: '1h'}
    );

    const verificationLink = `${process.env.BASE_URL}/verify/${token}`;
    await transporter.sendMail({
      from: `"No Reply" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Email Verification',
      html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
    });
  } catch (error) {
    throw new CustomError('Failed to send verification email', 500, {error});
  }
};

export {generateTokens, refreshToken, removeRefreshToken, sendVerificationEmail};
