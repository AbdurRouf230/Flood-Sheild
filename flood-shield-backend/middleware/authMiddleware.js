const jwt = require('jsonwebtoken');
const { findUserByUid } = require('../utils/dbStore');

/**
 * Protect endpoints by verifying the backend JWT session token
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ message: 'Not authorized, no session token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_token_for_flood_shield_platform');

      req.user = await findUserByUid(decoded.uid);

      if (!req.user) {
        return res.status(401).json({ message: 'User session not found in database. Please log in again.' });
      }

      next();
    } catch (error) {
      if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
        console.error('Session authentication error:', error.message);
      }
      return res.status(401).json({ message: 'Not authorized, session token invalid or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no session token provided' });
  }
};

/**
 * Restrict routes based on role clearance
 * @param {string[]} roles - Array of allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, missing profile context' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Role '${req.user.role}' lacks clearance for this operation.` 
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize
};
