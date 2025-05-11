const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware collection
 */
const validators = {
  /**
   * Validate registration input
   */
  register: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 50 })
      .withMessage('Name cannot be more than 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'organizer', 'user'])
      .withMessage('Invalid role')
  ],

  /**
   * Validate login input
   */
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
  ],

  /**
   * Validate create event input
   */
  createEvent: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot be more than 100 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required'),
    body('location')
      .trim()
      .notEmpty()
      .withMessage('Location is required'),
    body('date')
      .notEmpty()
      .withMessage('Date is required')
      .isISO8601()
      .withMessage('Invalid date format'),
    body('startTime')
      .trim()
      .notEmpty()
      .withMessage('Start time is required'),
    body('endTime')
      .trim()
      .notEmpty()
      .withMessage('End time is required'),
    body('capacity')
      .isInt({ min: 1 })
      .withMessage('Capacity must be at least 1'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ],

  /**
   * Validate update event input
   */
  updateEvent: [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title cannot be more than 100 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('capacity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacity must be at least 1'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID')
  ],

  /**
   * Validate create booking input
   */
  createBooking: [
    body('event')
      .isMongoId()
      .withMessage('Invalid event ID'),
    body('ticketCount')
      .isInt({ min: 1, max: 10 })
      .withMessage('Ticket count must be between 1 and 10'),
    body('specialRequests')
      .optional()
      .trim()
  ],

  /**
   * Validate ID parameter
   */
  validateId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ],

  /**
   * Validate pagination parameters
   */
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  /**
   * Validate category input
   */
  createCategory: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ max: 50 })
      .withMessage('Category name cannot be more than 50 characters')
  ],
  
  /**
   * Validate tag input
   */
  createTag: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Tag name is required')
      .isLength({ max: 30 })
      .withMessage('Tag name cannot be more than 30 characters')
  ],

  /**
   * Check for validation errors and format response
   */
  validate: (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }
};

module.exports = validators;