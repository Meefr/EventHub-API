const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { protect } = require('../middlewares/auth');
const validators = require('../utils/validators');

router.post('/', protect, validators.createBooking, validators.validate, bookingController.createBooking);
router.get('/', protect, bookingController.getUserBookings);
router.get('/:id', protect, bookingController.getBooking);
router.put('/:id/cancel', protect, bookingController.cancelBooking);
module.exports = router;