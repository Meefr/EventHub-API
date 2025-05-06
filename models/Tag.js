const mongoose = require('mongoose');
const slugify = require('slugify');

const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a tag name'],
      unique: true,
      trim: true,
      maxlength: [30, 'Tag name cannot be more than 30 characters']
    },
    slug: String,
    color: {
      type: String,
      default: '#2ecc71' // Default green color
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    translations: {
      en: {
        name: String
      },
      ar: {
        name: String
      }
    }
  },
  {
    timestamps: true
  }
);

// Create tag slug from the name
TagSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

module.exports = mongoose.model('Tag', TagSchema);