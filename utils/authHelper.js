import process from 'node:process';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import RefreshToken from '../models/refreshToken.js';

// const refreshTokens = [];

const generateTokens = async (user) => {
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

  // refreshTokens.push(refreshToken);
  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt
  });
  return {accessToken, refreshToken};
};

const refreshToken = async (token) => {
  // if (!refreshTokens.includes(token)) {
  //   throw new Error('Invalid refresh token');
  // }

  const storedToken = await RefreshToken.findOne({token});
  if (!storedToken) {
    throw new Error('Invalid refresh token');
  }

  const userInfo = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  // delete refreshTokens.filter((t) => t === token);
  await RefreshToken.deleteOne({token});

  const tokens = generateTokens(userInfo);

  return tokens;
};

const removeRefreshToken = async (refreshToken) => {
  await RefreshToken.deleteOne({refreshToken});
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (user) => {
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
};

export {generateTokens, refreshToken, /* refreshTokens, */ removeRefreshToken, sendVerificationEmail};
