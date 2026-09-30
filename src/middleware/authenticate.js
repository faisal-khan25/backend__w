const { User } = require('../models');
const { parseClaims, isTokenType, TokenType } = require('../utils/jwt');

module.exports = async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.substring(7);

  try {
    const claims = parseClaims(token);

    if (isTokenType(claims, TokenType.ACCESS)) {
      const user = await User.findOne({ where: { email: claims.email } });
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
  }

  next();
};
