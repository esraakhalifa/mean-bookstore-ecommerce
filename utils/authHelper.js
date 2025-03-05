import process from 'node:process';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const refreshTokens = [];

const generateTokens = (user) => {
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

  refreshTokens.push(refreshToken);
  return {accessToken, refreshToken};
};

const refreshToken = (token) => {
  if (!refreshTokens.includes(token)) {
    throw new Error('Invalid refresh token');
  }

  const userInfo = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  refreshTokens = refreshTokens.filter((t) => t !== token);
  const tokens = generateTokens(userInfo);

  return tokens;
};

const removeRefreshToken = (refreshToken) => {
  refreshTokens = refreshTokens.filter((t) => t !== refreshToken);
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

export {generateTokens, refreshToken, refreshTokens, removeRefreshToken, sendVerificationEmail};
