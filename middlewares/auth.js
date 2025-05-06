const jwt = require('jsonwebtoken');
const { ErrorResponse } = require('./errorHandler');
const User = require('../models/User');
const { roles, getPermissions } = require('../config/roles');

/**
 * Protect routes - check if user is authenticated
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check if auth header exists and has correct format
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Allow token from cookie as fallback
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new ErrorResponse('User not found', 404));
    }

    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

/**
 * Grant access to specific roles
 */
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    
    next();
  };
};

/**
 * Check permissions for specific actions
 */
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }

    const userPermissions = getPermissions(req.user.role);
    
    if (!userPermissions.includes(requiredPermission)) {
      return next(
        new ErrorResponse(
          `You don't have permission to perform this action`,
          403
        )
      );
    }
    
    next();
  };
};