/**
 * Centralized error handler middleware.
 * @param {Error} err - The error object.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 */
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for development
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  // Mongoose bad ObjectId vs other CastErrors
  if (err.name === 'CastError') {
    if (err.kind === 'ObjectId') {
      const message = `Resource not found with id of ${err.value}`;
      error = { message, status: 404 };
    } else {
      const message = `Invalid data provided for ${err.path}: ${err.value}`;
      error = { message, status: 400 };
    }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, status: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, status: 400 };
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};
