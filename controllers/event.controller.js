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
const { default: slugify } = require("slugify");
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
    req.body.organizer = req.user.id;

    // Step 1: Normalize tags
    if (typeof req.body.tags === "string") {
      req.body.tags = req.body.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    if (Array.isArray(req.body.tags) && req.body.tags.length > 0) {
      const inputTags = req.body.tags.map((tag) => tag.trim()).filter(Boolean);
      const slugs = inputTags.map((tag) => slugify(tag, { lower: true }));

      // Step 2: Find existing tags
      const existingTags = await Tag.find({ slug: { $in: slugs } });
      const existingTagSlugs = existingTags.map((tag) => tag.slug);

      const tagsToCreate = slugs
        .map((slug, idx) => ({ slug, name: inputTags[idx] }))
        .filter((tag) => !existingTagSlugs.includes(tag.slug));

      // Step 3: Create missing tags
      const createdTags = await Tag.insertMany(
        tagsToCreate.map((tag) => ({
          name: tag.name,
          slug: tag.slug,
          createdBy: req.user.id, // Optional: track creator
        }))
      );

      const allTags = [...existingTags, ...createdTags];
      req.body.tags = allTags.map((tag) => tag._id);
    }

    // Validate category
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return next(new ErrorResponse("Category not found", 404));
      }
    }

    // Handle image upload
    let imageUrl = "";
    if (req.file && req.file.buffer) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer);
      } catch (cloudError) {
        return next(cloudError);
      }
    }

    // Create the event
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
    }

    console.log("Final image URL:", imageUrl);

    // Prepare update data
    const updateData = {
      ...req.body,
      ...(typeof imageUrl !== "undefined"
        ? { image: imageUrl }
        : { $unset: { image: "" } }),
    };

    // Process tags similar to createEvent
    if (typeof updateData.tags === "string") {
      updateData.tags = updateData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    if (updateData.tags !== undefined) {
      // If tags is empty array or empty string, set it to empty array
      if (
        (Array.isArray(updateData.tags) && updateData.tags.length === 0) ||
        updateData.tags === ""
      ) {
        updateData.tags = [];
      }
      // Process tags if they exist and are not empty
      else if (Array.isArray(updateData.tags) && updateData.tags.length > 0) {
        const inputTags = updateData.tags.map((tag) => tag.trim()).filter(Boolean);
        
        // Skip processing if no valid tags after filtering
        if (inputTags.length === 0) {
          updateData.tags = [];
        } else {
          const slugs = inputTags.map((tag) => slugify(tag, { lower: true }));

          // Find existing tags
          const existingTags = await Tag.find({ slug: { $in: slugs } });
          const existingTagSlugs = existingTags.map((tag) => tag.slug);

          const tagsToCreate = slugs
            .map((slug, idx) => ({ slug, name: inputTags[idx] }))
            .filter((tag) => !existingTagSlugs.includes(tag.slug));

          // Create missing tags
          const createdTags = await Tag.insertMany(
            tagsToCreate.map((tag) => ({
              name: tag.name,
              slug: tag.slug,
              createdBy: req.user.id,
            }))
          );

          const allTags = [...existingTags, ...createdTags];
          updateData.tags = allTags.map((tag) => tag._id);
        }
      }
    }

    // Validate category
    if (updateData.category) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        return next(new ErrorResponse("Category not found", 404));
      }
    }

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
/**
 * @desc    Get all categories
 * @route   DELETE /api/v1/events/categories
 * @access  Protected
 */
exports.deleteEventCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    // Check if any events are using this category
    const eventUsingCategory = await Event.findOne({ category: categoryId });

    if (eventUsingCategory) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category: It is used by existing events.",
      });
    }

    const deleted = await Category.findByIdAndDelete(categoryId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
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
