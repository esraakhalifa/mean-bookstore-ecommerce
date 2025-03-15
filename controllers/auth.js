import process from 'node:process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/users.js';
import * as authUtils from '../utils/authHelper.js';
import CustomError from '../utils/CustomError.js'; // Import CustomError

export const getLogin = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/home');
  }
};

export const getSignup = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/home');
  }
};

export const googleAuth = passport.authenticate('google', {scope: ['profile', 'email']});

export const googleAuthCallback = passport.authenticate('google', {failureRedirect: '/login'});

export const googleAuthSuccess = (req, res) => {
  res.redirect('/home');
};

export const getProfile = (req, res) => {
  if (!req.isAuthenticated()) {
    throw new CustomError('Unauthorized: Please log in', 401);
  }
  res.send(`Welcome, ${req.user.displayName}`);
};

export const postLogin = async (req, res, next) => {
  try {
    const {email, password} = req.body;

    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    const user = await User.findOne({email});
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    const tokens = await authUtils.generateTokens(user);
    res.status(200).json({accessToken: tokens.AccessToken, refreshToken: tokens.RefreshToken});
  } catch (error) {
    next(error);
  }
};

export const postSignup = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      userName,
      email,
      password,
      confirmPassword,
      profile
    } = req.body;

    const isVerified = false;
    const role = 'customer';
    const userProfile = profile ? structuredClone(profile) : {};

    if (!email || !password || !confirmPassword) {
      throw new CustomError('All fields are required', 400);
    }

    if (password !== confirmPassword) {
      throw new CustomError('Passwords do not match', 400);
    }

    const existingUser = await User.findOne({email});
    if (existingUser) {
      throw new CustomError('User already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      userName,
      profile: userProfile,
      isVerified,
      cart: {books: [], totalAmount: 0},
      payment_details: {card: [], online_wallet: undefined},
      role
    });

    await user.save();
    res.status(201).json({message: 'User created successfully'});
  } catch (error) {
    next(error);
  }
};

export const postLogout = async (req, res, next) => {
  try {
    const {refreshToken} = req.body;

    if (!refreshToken) {
      throw new CustomError('Refresh Token is required', 400);
    }

    await authUtils.removeRefreshToken(refreshToken);
    res.status(200).json({message: 'Logged out successfully'});
  } catch (error) {
    next(error);
  }
};

export const postRefresh = async (req, res, next) => {
  try {
    const {refreshToken} = req.body;

    if (!refreshToken) {
      throw new CustomError('Refresh Token is required', 401);
    }

    const tokens = await authUtils.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    next(new CustomError('Invalid Refresh Token', 403));
  }
};

export const emailVerify = async (req, res, next) => {
  try {
    const {token} = req.params;
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    await User.findByIdAndUpdate(decoded.id, {verified: true});

    res.status(200).json({message: 'Email verified, you can log in'});
  } catch (error) {
    next(new CustomError('Invalid or expired token', 400));
  }
};
