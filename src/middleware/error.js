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
    let message = 'Duplicate field value entered';
    if (err.keyValue) {
      const field = Object.keys(err.keyValue)[0];
      const value = err.keyValue[field];
      let fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      
      // Better formatting for common fields
      if (field === 'phone') fieldName = 'Phone number';
      if (field === 'email') fieldName = 'Email address';
      if (field === 'gxId') fieldName = 'GX ID';
      
      message = `${fieldName} '${value}' already exists`;
    }
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
