const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true
    },
    teacher: {
      type: String,
      required: true
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String, // format "HH:mm"
      required: true
    },
    endTime: {
      type: String, // format "HH:mm"
      required: true
    },
    course: {
      type: String,
      required: true
    },
    branch: {
      type: String,
      required: true
    },
    room: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timetable', TimetableSchema);
