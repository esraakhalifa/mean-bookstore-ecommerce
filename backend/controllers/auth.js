import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import * as authUtils from '../utils/authHelper.js';


export const getLogin = (req, res, next) => {
  // res.render('auth/login', {
  //     path: '/login',
  // });
  //render the login frontend page
};

  
export const getSignup = (req, res, next) => {
  // res.render('auth/signup', {
  //     path: '/signup',
  // });
  //render the signup frontend page
};


export const postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
      return res.redirect('/login');
  }

  User.findOne({ email: email })
      .then(user => {
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          bcrypt
              .compare(password, user.password)
              .then(doMatch => {
                  if (doMatch) {
                      console.log("user logged success");
                      const tokens = authUtils.generateTokens(user);
                      res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
                      //go to home page with user signed in
                      return;
                  }
                  return res.status(401).json({ message: 'Invalid credentials' });
              })
              .catch(err => {
                console.log(err);
                res.status(500).json({ message: 'Internal server error' });
              });
      })
      .catch(err => {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
      });
  };


export const postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  User.findOne({ email: email })
      .then(userDoc => {
          if (userDoc) {
            return res.status(409).json({ message: 'User already exists' });
        }

          return bcrypt
              .hash(password, 12)
              .then(hashedPassword => {
                //////////////////////create user object and save its data ----> use the user model
                  const user = new User({
                      email: email,
                      password: hashedPassword,
                      cart: { items: [] },
                      role: 'client' //default role
                  });
                  console.log("user is created");
                  return user.save();
              })
              .then(result => {
                res.status(201).json({ message: 'User created successfully' });
            });
      })
      .catch(err => {
            console.log(err);
            res.status(500).json({ message: 'Internal server error' });
        });
};


export const postLogout = (req, res, next) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh Token is required' });
  }

  authUtils.removeRefreshToken(refreshToken);
    res.status(200).json({ message: 'Logged out successfully' });
};
  


export const postRefresh = (req, res, next) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh Token is required' });
  }

  try {
      const tokens = authUtils.refreshToken(refreshToken);
      return res.json(tokens);
  } catch (err) {
      return res.status(403).json({ message: 'Invalid Refresh Token' });
  }
};

  