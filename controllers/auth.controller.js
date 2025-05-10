// const User = require('../models/User');
// const { ErrorResponse } = require('../middlewares/errorHandler');
// const ApiResponse = require('../utils/responses');
// const asyncHandler = require('../utils/asyncHandler');

// /**
//  * @desc    Register user
//  * @route   POST /api/v1/auth/register
//  * @access  Public
//  */
// exports.register = asyncHandler(async (req, res, next) => {
//   const { name, email, password, role } = req.body;

//   // Check if email already exists
//   const existingUser = await User.findOne({ email });
//   if (existingUser) {
//     return next(new ErrorResponse('Email already in use', 400));
//   }

//   // Create user
//   const user = await User.create({
//     name,
//     email,
//     password,
//     role: role || 'user'
//   });

//   sendTokenResponse(user, 201, res, 'User registered successfully');
// });

// /**
//  * @desc    Login user
//  * @route   POST /api/v1/auth/login
//  * @access  Public
//  */
// exports.login = asyncHandler(async (req, res, next) => {
//   const { email, password } = req.body;

//   // Validate email & password
//   if (!email || !password) {
//     return next(new ErrorResponse('Please provide an email and password', 400));
//   }

//   // Check for user
//   const user = await User.findOne({ email }).select('+password');

//   if (!user) {
//     return next(new ErrorResponse('Invalid credentials', 401));
//   }

//   // Check if password matches
//   const isMatch = await user.matchPassword(password);

//   if (!isMatch) {
//     return next(new ErrorResponse('Invalid credentials', 401));
//   }

//   sendTokenResponse(user, 200, res, 'Login successful');
// });

// /**
//  * @desc    Get current logged in user
//  * @route   GET /api/v1/auth/me
//  * @access  Private
//  */
// exports.getMe = asyncHandler(async (req, res, next) => {
//   // user is already available in req due to the auth middleware
//   const user = await User.findById(req.user.id);

//   ApiResponse.success(res, 'User retrieved successfully', user);
// });

// /**
//  * @desc    Update user details
//  * @route   PUT /api/v1/auth/updatedetails
//  * @access  Private
//  */
// exports.updateDetails = asyncHandler(async (req, res, next) => {
//   const fieldsToUpdate = {
//     name: req.body.name,
//     email: req.body.email,
//     phone: req.body.phone,
//     preferredLanguage: req.body.preferredLanguage,
//     darkMode: req.body.darkMode
//   };

//   // Filter out undefined values
//   Object.keys(fieldsToUpdate).forEach(
//     key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
//   );

//   const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
//     new: true,
//     runValidators: true
//   });

//   ApiResponse.success(res, 'User details updated successfully', user);
// });

// /**
//  * @desc    Update password
//  * @route   PUT /api/v1/auth/updatepassword
//  * @access  Private
//  */
// exports.updatePassword = asyncHandler(async (req, res, next) => {
//   const { currentPassword, newPassword } = req.body;

//   if (!currentPassword || !newPassword) {
//     return next(new ErrorResponse('Please provide current and new password', 400));
//   }

//   const user = await User.findById(req.user.id).select('+password');

//   // Check current password
//   if (!(await user.matchPassword(currentPassword))) {
//     return next(new ErrorResponse('Current password is incorrect', 401));
//   }

//   user.password = newPassword;
//   await user.save();

//   sendTokenResponse(user, 200, res, 'Password updated successfully');
// });

// /**
//  * @desc    Logout user / clear cookie
//  * @route   GET /api/v1/auth/logout
//  * @access  Private
//  */
// exports.logout = asyncHandler(async (req, res, next) => {
//   // Clear cookie if using cookies
//   if (req.cookies.token) {
//     res.cookie('token', 'none', {
//       expires: new Date(Date.now() + 10 * 1000),
//       httpOnly: true
//     });
//   }

//   ApiResponse.success(res, 'User logged out successfully');
// });

// /**
//  * Get token from model, create cookie and send response
//  */
// const sendTokenResponse = (user, statusCode, res, message) => {
//   // Create token
//   const token = user.getSignedJwtToken();

//   // Remove password from output
//   user.password = undefined;

//   ApiResponse.success(res, message, { user, token }, statusCode);
// };


const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ErrorResponse } = require('../middlewares/errorHandler');
// const logger = require('../utils/logger');

/**
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });    
    if (userExists) {
      return next(new ErrorResponse('Email already registered', 400));
    }

    // Create user with role (default is 'user' if not provided)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    // Send token response
    sendTokenResponse(user, 201, res, req.t);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Send token response
    sendTokenResponse(user, 200, res, req.t);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Log user out / clear cookie
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
exports.logout = (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: req.t('user_logged_out')
  });
};

/**
 * @desc    Update user details
 * @route   PUT /api/v1/auth/updatedetails
 * @access  Private
 */
exports.updateDetails = async (req, res, next) => {
  try {
    // Only allow certain fields to be updated
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      preferredLanguage: req.body.preferredLanguage,
      darkMode: req.body.darkMode
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // Update user
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ErrorResponse('Password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    // Send token response
    sendTokenResponse(user, 200, res, req.t);
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to get token from model, create cookie and send response
 */
const sendTokenResponse = (user, statusCode, res, t) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Set secure flag in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Remove password from output
  user.password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message: t ? t('login_success') : 'Login successful',
      token,
      user
    });
};