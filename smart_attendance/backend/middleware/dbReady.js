const mongoose = require('mongoose');

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    success: false,
    error: 'Database unavailable',
    message: 'Service is running in degraded mode. Connect MongoDB to use this endpoint.'
  });
};

module.exports = { requireDatabase };
