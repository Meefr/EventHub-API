const { body, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const { ErrorResponse } = require("../middlewares/errorHandler");
const { v4: uuidv4 } = require('uuid'); // For generating unique filenames

// const logger = require('../utils/logger');

/**
 * @desc    Get all events
 * @route   GET /api/v1/events
 * @access  Public
 */
exports.getEvents = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ["select", "sort", "page", "limit", "search"];
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\\b(gt|gte|lt|lte|in)\\b/g,
      (match) => `$${match}`
    );

    // Finding resources
    let query = Event.find(JSON.parse(queryStr));

    // Handle search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query = query.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { location: searchRegex },
        ],
      });
    }

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ");
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-date");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    query = query.skip(startIndex).limit(limit);

    // Populate related data
    query = query.populate([
      { path: "organizer", select: "name email" },
      { path: "category", select: "name" },
      { path: "tags", select: "name" },
    ]);

    // Executing query
    const events = await query;
    const total = await Event.countDocuments(JSON.parse(queryStr));

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: events.length,
      pagination,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single event
 * @route   GET /api/v1/events/:id
 * @access  Public
 */
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate([
      { path: "organizer", select: "name email" },
      { path: "category", select: "name description" },
      { path: "tags", select: "name" },
    ]);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new event
 * @route   POST /api/v1/events
 * @access  Private
 */
exports.createEvent = async (req, res, next) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Add user to req.body as organizer
    req.body.organizer = req.user.id;

    // Handle category
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return next(new ErrorResponse("Category not found", 404));
      }
    }

    // Handle tags
    if (req.body.tags) {
      if (typeof req.body.tags === "string") {
        req.body.tags = req.body.tags.split(",");
      }
      for (const tagId of req.body.tags) {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          return next(new ErrorResponse(`Tag with id ${tagId} not found`, 404));
        }
      }
    }

    let imageName = null;

    // Handle image upload
    if (req.file) {
      const fileExt = path.extname(req.file.originalname);
      imageName = `${uuidv4()}${fileExt}`;
      const uploadPath = path.join(__dirname, "../uploads", imageName);

      try {
        await fs.rename(req.file.path, uploadPath); // Move the uploaded file to the uploads folder
      } catch (error) {
        console.error("Error saving image:", error);
        return next(new ErrorResponse("Error saving the uploaded image", 500));
      }
    } else {
      return next(
        new ErrorResponse("Please upload an image for the event", 400)
      );
    }

    // Create the event
    const event = await Event.create({
      ...req.body,
      image: imageName, // Save the unique image name in the database
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error("Error creating event:", err);
    next(err);
  }
};
/**
 * @desc    Update event
 * @route   PUT /api/v1/events/:id
 * @access  Private
 */
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is event organizer or admin
    if (
      event.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this event`,
          403
        )
      );
    }

    // Handle tags
    if (req.body.tags) {
      // Convert string of IDs to array
      if (typeof req.body.tags === "string") {
        req.body.tags = req.body.tags.split(",");
      }

      // Verify all tags exist
      for (const tagId of req.body.tags) {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          return next(new ErrorResponse(`Tag with id ${tagId} not found`, 404));
        }
      }
    }

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete event
 * @route   DELETE /api/v1/events/:id
 * @access  Private
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is event organizer or admin
    if (
      event.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this event`,
          403
        )
      );
    }

    // Check if event has bookings
    const bookings = await Booking.find({ event: req.params.id });
    if (bookings.length > 0) {
      return next(
        new ErrorResponse(`Cannot delete event with active bookings`, 400)
      );
    }

    await event.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Upload event image
 * @route   PUT /api/v1/events/:id/image
 * @access  Private
 */
exports.eventImageUpload = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is event organizer or admin
    if (
      event.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this event`,
          403
        )
      );
    }

    if (!req.file) {
      return next(new ErrorResponse("Please upload a file", 400));
    }

    // Update event with filename
    event.image = req.file.filename;
    await event.save();

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get events by organizer
 * @route   GET /api/v1/events/organizer/:id
 * @access  Public
 */
exports.getEventsByOrganizer = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.params.id }).populate([
      { path: "category", select: "name" },
      { path: "tags", select: "name" },
    ]);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get featured events
 * @route   GET /api/v1/events/featured
 * @access  Public
 */
exports.getFeaturedEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ isFeatured: true, isPublished: true })
      .limit(6)
      .populate([
        { path: "organizer", select: "name" },
        { path: "category", select: "name" },
      ]);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get upcoming events
 * @route   GET /api/v1/events/upcoming
 * @access  Public
 */
exports.getUpcomingEvents = async (req, res, next) => {
  try {
    const events = await Event.find({
      date: { $gte: new Date() },
      isPublished: true,
    })
      .sort("date")
      .limit(10)
      .populate([
        { path: "organizer", select: "name" },
        { path: "category", select: "name" },
      ]);

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/v1/events/categories
 * @access  Public
 */
exports.getEventCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

// exports.createCategory = [
//   body("name")
//     .notEmpty()
//     .withMessage("Category name is required")
//     .isString()
//     .trim()
//     .isLength({ max: 50 })
//     .withMessage("Category name cannot be more than 50 characters"),
//   // Add validation for translations if needed
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     next();
//   },
// ];

exports.createCategory = async (req, res, next) => {
  const { name, translations } = req.body;

  const category = await Category.create({
    name,
    translations,
  });

  res.status(201).json({
    success: true,
    data: category,
  });
};
