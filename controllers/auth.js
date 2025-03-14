import process from 'node:process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import User from '../models/users.js';
import * as authUtils from '../utils/authHelper.js';

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

/* , (req, res) => {
  res.redirect(`http://localhost:4200/login?token=${req.user.token}`);
}); */

export const googleAuthSuccess = (req, res) => {
  res.redirect('/home');
};

export const getProfile = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.send(`Welcome, ${req.user.displayName}`);
};

export const postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.redirect('/login');
  }

  User.findOne({email})
    .then((user) => {
      if (!user) {
        return res.status(404).json({message: 'User not found'});
      }
      bcrypt
        .compare(password, user.password)
        .then(async (doMatch) => {
          if (doMatch) {
            const tokens = await authUtils.generateTokens(user);
            return res.status(200).json({accessToken: tokens.AccessToken, refreshToken: tokens.RefreshToken});
          }
          return res.status(401).json({message: 'Invalid credentials'});
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({message: 'Internal server error'});
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({message: 'Internal server error'});
    });
};

export const postSignup = (req, res, next) => {
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
  const userProfile = profile ? structuredClone(profile) : {addresses: [], phone_numbers: []};

  if (!email || !password || !confirmPassword) {
    return res.status(400).json({message: 'All fields are required'});
  }

  if (password !== confirmPassword) {
    return res.status(400).json({message: 'Passwords do not match'});
  }
  User.findOne({email})
    .then((userDoc) => {
      if (userDoc) {
        return res.status(409).json({message: 'User already exists'});
      }

      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
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
          console.log('user is created');
          return user.save();
        })
        .then((result) => {
          res.status(201).json({message: 'User created successfully'});
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({message: 'Internal server error'});
    });
};

export const postLogout = (req, res, next) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({message: 'Refresh Token is required'});
  }

  authUtils.removeRefreshToken(refreshToken);
  res.status(200).json({message: 'Logged out successfully'});
};

export const postRefresh = (req, res, next) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({message: 'Refresh Token is required'});
  }

  try {
    const tokens = authUtils.refreshToken(refreshToken);
    return res.json(tokens);
  } catch (err) {
    return res.status(403).json({message: 'Invalid Refresh Token'});
  }
};

export const emailVerify = async (req, res, next) => {
  try {
    const {token} = req.params;
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    await User.findByIdAndUpdate(decoded.id, {verified: true});

    res.status(200).json({message: 'Email verified, you can log in'});
  } catch (err) {
    res.status(400).json({message: 'Invalid or expired token'});
  }
};
