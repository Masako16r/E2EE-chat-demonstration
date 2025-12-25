// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error', 
      details: err.message 
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      message: 'Unauthorized' 
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ 
      message: 'Unique constraint violation' 
    });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
