const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['holiday', 'leave'],
      default: 'holiday'
    },
    description: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

HolidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', HolidaySchema);
