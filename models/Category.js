const mongoose = require('mongoose');
const slugify = require('slugify');

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      unique: true,
      trim: true,
      maxlength: [50, 'Category name cannot be more than 50 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    translations: {
      en: {
        name: String,
        description: String
      },
      ar: {
        name: String,
        description: String
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create category slug from the name
CategorySchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Virtual for events in this category
CategorySchema.virtual('events', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'category',
  justOne: false
});

module.exports = mongoose.model('Category', CategorySchema);