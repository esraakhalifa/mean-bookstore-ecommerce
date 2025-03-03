import jwt from 'jsonwebtoken';

let refreshTokens = [];

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  refreshTokens.push(refreshToken);
  return { accessToken, refreshToken };
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


export { refreshTokens, generateTokens, refreshToken,removeRefreshToken };
