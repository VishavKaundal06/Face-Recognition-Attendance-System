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
      maxlength: 100,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
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
        message: 'faceDescriptor must be empty or an array of 128 numeric values',
      },
    },
    hasFace: {
      type: Boolean,
      default: false,
    },
    photoPath: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.faceDescriptor;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.faceDescriptor;
        return ret;
      },
    },
  }
);

StudentSchema.index({ isActive: 1, rollNumber: 1 });
StudentSchema.index({ isActive: 1, email: 1 });

StudentSchema.pre('validate', function syncHasFace(next) {
  this.hasFace = Array.isArray(this.faceDescriptor) && this.faceDescriptor.length > 0;
  next();
});

module.exports = mongoose.model('Student', StudentSchema);
