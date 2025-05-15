const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.ObjectId,
      ref: 'Event',
      required: true
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    ticketCount: {
      type: Number,
      required: [true, 'Please add number of tickets'],
      min: [1, 'Cannot book less than 1 ticket'],
      max: [10, 'Cannot book more than 10 tickets at once']
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed'
    },
    totalPrice: {
      type: Number
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'paypal', 'onsite', 'free'],
      default: 'free'
    },
    specialRequests: {
      type: String
    },
    bookingReference: {
      type: String,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

// Generate booking reference
BookingSchema.pre('save', function(next) {
  // If booking reference already exists, skip
  if (this.bookingReference) {
    return next();
  }
  
  // Generate a random reference number with timestamp
  const timestamp = new Date().getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  this.bookingReference = `BK-${timestamp}-${random}`;
  
  next();
});

// Update total price based on event price and ticket count
BookingSchema.pre('save', async function(next) {
  if (!this.isModified('ticketCount') && this.totalPrice) {
    return next();
  }
  
  try {
    const event = await this.model('Event').findById(this.event);
    this.totalPrice = event.price * this.ticketCount;
    
    // Set payment method to free if total price is 0
    if (this.totalPrice === 0) {
      this.paymentMethod = 'free';
      this.paymentStatus = 'paid';
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

// Update available tickets in event when booking is created or status changes
BookingSchema.post('save', async function() {
  try {
    const event = await this.model('Event').findById(this.event);
    
    // Calculate tickets to add/subtract based on status
    let ticketChange = 0;
    
    if (this.status === 'confirmed') {
      ticketChange = -this.ticketCount;
    } else if (this.status === 'cancelled' && this._previousStatus === 'confirmed') {
      ticketChange = this.ticketCount;
    }
    
    if (ticketChange !== 0) {
      event.availableTickets += ticketChange;
      await event.save();
    }
  } catch (err) {
    console.error('Error updating available tickets:', err);
  }
});

// Store previous status before updating
BookingSchema.pre('findOneAndUpdate', function() {
  this._update = this._update || {};
  if (this._update.status) {
    this.findOne().then(doc => {
      if (doc) {
        doc._previousStatus = doc.status;
      }
    });
  }
});

module.exports = mongoose.model('Booking', BookingSchema);