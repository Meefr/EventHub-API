const { validationResult } = require("express-validator");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const { ErrorResponse } = require("../middlewares/errorHandler");
// const logger = require('../utils/logger');

/**
 * @desc    Create new booking
 * @route   POST /api/v1/bookings
 * @access  Private
 */
exports.createBooking = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { event, ticketCount, specialRequests } = req.body;

    // Check if event exists and has available tickets
    const eventDoc = await Event.findById(event);
    if (!eventDoc) {
      return next(new ErrorResponse("Event not found", 404));
    }

    if (eventDoc.availableTickets < ticketCount) {
      return next(new ErrorResponse("Not enough tickets available", 400));
    }
    eventDoc.availableTickets -= ticketCount;
    await eventDoc.save();
    // Create booking
    const booking = await Booking.create({
      event,
      user: req.user.id,
      ticketCount,
      specialRequests,
    });

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user bookings
 * @route   GET /api/v1/bookings
 * @access  Private
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate({
      path: "event",
      select: "title date location image",
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single booking
 * @route   GET /api/v1/bookings/:id
 * @access  Private
 */
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: "event",
        select: "title date location image",
      })
      .populate({
        path: "user",
        select: "name email",
      });

    if (!booking) {
      return next(
        new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns the booking or is admin
    if (
      booking.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this booking`,
          403
        )
      );
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/v1/bookings/:id/cancel
 * @access  Private
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return next(
        new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
      );
    }
    // Make sure user owns the booking or is admin
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to cancel this booking`,
          403
        )
      );
    }
    const event = await Event.findById(booking.event);
    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${booking.event}`, 404)
      );
    }

    // Can only cancel pending or confirmed bookings
    if (booking.status === "cancelled") {
      return next(new ErrorResponse("Booking is already cancelled", 400));
    }

    event.availableTickets += booking.ticketCount;
    await event.save();
    // Delete the booking
    await booking.deleteOne();
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
};
