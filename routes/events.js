const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const upload = require('../middlewares/upload');
const { protect, authorize } = require('../middlewares/auth');
const validators = require('../utils/validators');

router.get('/', validators.pagination, validators.validate, eventController.getEvents);
router.get('/:id', validators.validateId, validators.validate, eventController.getEvent);
router.get('/organizer/:id', validators.validateId, validators.validate, eventController.getEventsByOrganizer);
router.get('/featured', eventController.getFeaturedEvents);
router.get('/upcoming', eventController.getUpcomingEvents);

// Protected routes
router.post('/', protect, authorize('organizer', 'admin'), validators.createEvent, validators.validate, eventController.createEvent);
router.put('/:id', protect, validators.validateId, validators.updateEvent, validators.validate, eventController.updateEvent);
router.delete('/:id', protect, validators.validateId, validators.validate, eventController.deleteEvent);
router.put('/:id/image', protect, validators.validateId, upload.single('image'), eventController.eventImageUpload);

module.exports = router;