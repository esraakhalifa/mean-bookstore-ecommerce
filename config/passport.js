import dotenv from 'dotenv';
import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import User from '../models/users.js';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({googleId: profile.id});

        if (!user) {
          user = new User({
            googleId: profile.id,
            userName: profile.displayName,
            firstName: profile.displayName.split(' ')[0],
            lastName: profile.displayName.split(' ')[1],
            email: profile.emails[0].value,
            isVerified: true, // OAuth users are considered verified
            role: 'customer',
            cart: {books: [], totalAmount: 1}
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Serialize user to store in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user when retrieving session data
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
