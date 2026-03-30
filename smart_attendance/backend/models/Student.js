const mongoose = require('mongoose');

const isValidFaceDescriptor = (value) => {
  if (!Array.isArray(value)) return false;
  if (value.length !== 128) return false;
  return value.every((num) => Number.isFinite(num));
};

const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    course: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    branch: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },
    department: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100
    },
    semester: {
      type: Number,
      required: false,
      min: 1,
      max: 12
    },
    faceDescriptor: {
      type: [Number], // Array of face encoding values
      required: false,
      default: [],
      select: false,
      validate: {
        validator(value) {
          if (!Array.isArray(value) || value.length === 0) return true;
          return isValidFaceDescriptor(value);
        },
        message: 'faceDescriptor must be empty or an array of 128 numeric values'
      }
    },
    hasFace: {
      type: Boolean,
      default: false
    },
    photoPath: {
      type: String,
      required: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    registrationDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.faceDescriptor;
        return ret;
      }
    },
    toObject: {
      transform(doc, ret) {
        delete ret.faceDescriptor;
        return ret;
      }
    }
  }
);

StudentSchema.index({ isActive: 1, rollNumber: 1 });
StudentSchema.index({ isActive: 1, email: 1 });

StudentSchema.pre('save', function syncFields(next) {
  if (this.branch && !this.department) {
    this.department = this.branch;
  } else if (this.department && !this.branch) {
    this.branch = this.department;
  }

  if (this.year && !this.semester) {
    this.semester = this.year;
  } else if (this.semester && !this.year) {
    this.year = this.semester;
  }
  next();
});

StudentSchema.pre('validate', function syncHasFace(next) {
  this.hasFace = Array.isArray(this.faceDescriptor) && this.faceDescriptor.length > 0;
  next();
});

const StudentModel = mongoose.model('Student', StudentSchema);

// Export mock model if DB is unavailable and allowed
const useMock = process.env.ALLOW_START_WITHOUT_DB === 'true' && mongoose.connection.readyState !== 1;
if (useMock) {
    console.warn('Using MockStudent model for in-memory storage.');
    module.exports = require('../utils/mockModels').MockStudent;
} else {
    module.exports = StudentModel;
}
