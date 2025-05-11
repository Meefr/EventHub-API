const mongoose = require('mongoose');
const slugify = require('slugify');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    slug: String,
    description: {
      type: String,
      required: [true, 'Please add a description']
    },
    location: {
      type: String,
      required: [true, 'Please add a location']
    },
    date: {
      type: Date,
      required: [true, 'Please add a date']
    },
    startTime: {
      type: String,
      required: [true, 'Please add start time']
    },
    endTime: {
      type: String,
      required: [true, 'Please add end time']
    },
    capacity: {
      type: Number,
      required: [true, 'Please add capacity']
    },
    price: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    image: {
      type: String,
      default: 'default-event.jpg'
    },
    organizer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: 'Category'
    },
    tags: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Tag'
      }
    ],
    availableTickets: {
      type: Number
    },
    languages: {
      type: [String],
      enum: ['en', 'ar'],
      default: ['en']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create event slug from the title
EventSchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  
  // Set availableTickets to capacity on first save
  if (this.isNew) {
    this.availableTickets = this.capacity;
  }
  
  next();
});

// Virtual for bookings for this event
EventSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'event',
  justOne: false
});

// Calculate if event is full
EventSchema.virtual('isFull').get(function () {
  return this.availableTickets <= 0;
});

// Calculate if event is upcoming
EventSchema.virtual('isUpcoming').get(function () {
  return new Date(this.date) > new Date();
});

module.exports = mongoose.model('Event', EventSchema);