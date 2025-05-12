const { body, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const { ErrorResponse } = require("../middlewares/errorHandler");
const { v4: uuidv4 } = require("uuid"); // For generating unique filenames

const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");
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
      /\b(gt|gte|lt|lte|in)\b/g,
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
      total,
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

exports.createEvent = async (req, res, next) => {
  try {
    // Attach logged-in user as organizer
    req.body.organizer = req.user.id;

    // Validate category
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return next(new ErrorResponse("Category not found", 404));
      }
    }

    let imageUrl = "";

    // Handle image upload
    // if (req.file) {
    //   const fileExt = path.extname(req.file.originalname);
    //   const imageName = `event-${uuidv4()}${fileExt}`;
    //   const uploadsDir = path.join(__dirname, "../uploads");

    //   // Ensure the uploads directory exists
    //   if (!fs.existsSync(uploadsDir)) {
    //     fs.mkdirSync(uploadsDir, { recursive: true });
    //   }

    //   // Full path for saving the file
    //   const imagePath = path.join(uploadsDir, imageName);

    //   // Move uploaded file to the uploads directory
    //   fs.renameSync(req.file.path, imagePath);

    //   // Construct image URL
    //   imageUrl = `${req.protocol}://${req.get('host')}/uploads/${imageName}`;
    // }
    if (req.file && req.file.buffer) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer);
      } catch (cloudError) {
        return next(cloudError);
      }
    }
    // Create the event with image URL
    const event = await Event.create({
      ...req.body,
      image: imageUrl,
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

exports.updateEvent = async (req, res, next) => {
  try {
    // Find existing event
    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent) {
      return next(new ErrorResponse("Event not found", 404));
    }

    let imageUrl = existingEvent.image;

    // Handle image deletion (explicit flag or new image upload)
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (existingEvent.image) {
        await deleteFromCloudinary(existingEvent.image);
      }

      // Upload new image
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult;
      // console.log("New image URL:", uploadResult);
    }

    // Handle new image upload
    // if (req.file) {
    //   const fileExt = path.extname(req.file.originalname);
    //   const imageName = `event-${uuidv4()}${fileExt}`;
    //   const uploadsDir = path.join(__dirname, "../uploads");

    //   if (!fs.existsSync(uploadsDir)) {
    //     fs.mkdirSync(uploadsDir, { recursive: true });
    //   }

    //   const imagePath = path.join(uploadsDir, imageName);
    //   fs.renameSync(req.file.path, imagePath);

    //   imageUrl = `${req.protocol}://${req.get("host")}/uploads/${imageName}`;
    // }

    console.log("Final image URL:", imageUrl);

    // Prepare update data
    const updateData = {
      ...req.body,
      ...(typeof imageUrl !== "undefined"
        ? { image: imageUrl }
        : { $unset: { image: "" } }),
    };

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedEvent,
    });
  } catch (err) {
    console.error("Error updating event:", err);

    if (req.file) {
      try {
        const failedUploadPath = path.join(
          __dirname,
          "../uploads",
          path.basename(req.file.path)
        );
        if (fs.existsSync(failedUploadPath)) {
          fs.unlinkSync(failedUploadPath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up failed upload:", cleanupError);
      }
    }

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

    // Use deleteOne() instead of remove()
    await Event.deleteOne({ _id: req.params.id });

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
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 6;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Find featured and published events with pagination
    const query = Event.find({ isFeatured: true, isPublished: true })
      .skip(startIndex)
      .limit(limit)
      .populate([
        { path: "organizer", select: "name" },
        { path: "category", select: "name" },
      ]);

    // Execute query
    const events = await query;
    
    // Get total count for pagination
    const total = await Event.countDocuments({ 
      isFeatured: true, 
      isPublished: true 
    });

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
      total,
      pagination,
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
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Base query for upcoming events
    const query = Event.find({
      date: { $gte: new Date() },
      isPublished: true,
    })
      .sort("date")
      .skip(startIndex)
      .limit(limit)
      .populate([
        { path: "organizer", select: "name" },
        { path: "category", select: "name" },
      ]);

    // Execute query
    const events = await query;

    // Get total count for pagination
    const total = await Event.countDocuments({
      date: { $gte: new Date() },
      isPublished: true,
    });

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
      total,
      pagination,
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
