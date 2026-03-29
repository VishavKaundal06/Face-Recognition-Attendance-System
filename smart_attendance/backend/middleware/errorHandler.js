// Global error-handling middleware
const errorHandler = (err, req, res, _next) => {
  console.error(err.stack || err.message || err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };
