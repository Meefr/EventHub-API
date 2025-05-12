const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const upload = require("../middlewares/upload");
const { protect, authorize } = require("../middlewares/auth");
const validators = require("../utils/validators");

router.get(
  "/",
  validators.pagination,
  validators.validate,
  eventController.getEvents
);
router.get(
  "/organizer/:id",
  validators.validateId,
  validators.validate,
  eventController.getEventsByOrganizer
);
router.get("/featured", eventController.getFeaturedEvents);
router.get("/upcoming", eventController.getUpcomingEvents);
router.get("/categories", eventController.getEventCategories);
router.get(
  "/event/:id",
  validators.validateId,
  validators.validate,
  eventController.getEvent
);
// Protected routes
// router.post(
//   "/",
//   protect,
//   authorize("organizer", "admin"),
//   upload.single("image"),
//   validators.createEvent,
//   validators.validate,
//   eventController.createEvent
// );

router
  .route("/")
  .post(
    protect,
    authorize("organizer", "admin"),
    upload.single("image"),
    eventController.createEvent
  );

router
  .route("/:id")
  .put(
    protect,
    authorize("organizer", "admin"),
    upload.single("image"),
    eventController.updateEvent
  );
// router.put(
//   "/:id",
//   protect,
//   validators.validateId,
//   validators.updateEvent,
//   validators.validate,
//   eventController.updateEvent
// );
router.delete(
  "/:id",
  protect,
  validators.validateId,
  validators.validate,
  eventController.deleteEvent
);
// router.put(
//   "/:id/image",
//   protect,
//   validators.validateId,
//   upload.single("image"),
//   eventController.eventImageUpload
// );

router.post(
  "/categories",
  protect,
  authorize("admin"),
  validators.createCategory,
  validators.validate,
  eventController.createCategory
);
router.delete(
  "/categories/:id",
  protect,
  authorize("admin"),
  eventController.deleteEventCategory
);
module.exports = router;
