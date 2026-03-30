const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    studentName: {
      type: String,
      required: true
    },
    rollNumber: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    timeIn: {
      type: Date,
      required: true,
      default: Date.now
    },
    timeOut: {
      type: Date,
      required: false
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave'],
      default: 'present'
    },
    confidence: {
      type: Number, // Confidence score of face match (0-1)
      required: false
    },
    photo: {
      type: String, // Path to captured photo
      required: false
    },
    remarks: {
      type: String,
      required: false
    },
    subject: {
      type: String,
      required: false
    },
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      required: false
    },

    deviceInfo: {
      type: Object,
      default: {}
    },
    location: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

// Index for faster queries
AttendanceSchema.index({ studentId: 1, date: 1 });
AttendanceSchema.index({ date: 1 });

const AttendanceModel = mongoose.model('Attendance', AttendanceSchema);

// Export mock model if DB is unavailable and allowed
const useMock = process.env.ALLOW_START_WITHOUT_DB === 'true' && mongoose.connection.readyState !== 1;
if (useMock) {
    console.warn('Using MockAttendance model for in-memory storage.');
    module.exports = require('../utils/mockModels').MockAttendance;
} else {
    module.exports = AttendanceModel;
}
