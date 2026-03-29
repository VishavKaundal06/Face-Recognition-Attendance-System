const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
    });
  }

  return next();
};

module.exports = { authenticateToken, authorizeRoles };
