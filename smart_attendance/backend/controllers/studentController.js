const Student = require('../models/Student');

const sanitizeStudent = (studentDoc) => {
  if (!studentDoc) return studentDoc;
  const obj = typeof studentDoc.toObject === 'function' ? studentDoc.toObject() : { ...studentDoc };
  delete obj.faceDescriptor;
  return obj;
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true }).select('-faceDescriptor');
    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get single student
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-faceDescriptor');
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }
    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Register student with face
exports.registerStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, department, semester, faceDescriptor } = req.body;

    // Check if student exists
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: 'Student with this roll number already exists',
      });
    }

    const student = new Student({
      name,
      rollNumber,
      email,
      department,
      semester,
      faceDescriptor: faceDescriptor || [], // Will be filled by face-api
      hasFace: Array.isArray(faceDescriptor) && faceDescriptor.length > 0,
    });

    await student.save();

    res.status(201).json({
      success: true,
      data: sanitizeStudent(student),
      message: 'Student registered successfully',
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: `Duplicate value for ${field}`,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { name, email, department, semester, faceDescriptor } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (semester !== undefined) updateData.semester = semester;
    if (faceDescriptor !== undefined) updateData.faceDescriptor = faceDescriptor;

    if (Array.isArray(faceDescriptor)) {
      updateData.hasFace = faceDescriptor.length > 0;
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-faceDescriptor');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: sanitizeStudent(student),
      message: 'Student updated successfully',
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: `Duplicate value for ${field}`,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Recognize face from descriptor
exports.recognizeFace = async (req, res) => {
  try {
    const { faceDescriptor, threshold = 0.6 } = req.body;

    if (!faceDescriptor) {
      return res.status(400).json({
        success: false,
        error: 'Face descriptor is required',
      });
    }

    // Get all students with face descriptors
    const students = await Student.find({
      isActive: true,
      faceDescriptor: { $exists: true, $ne: [] },
    }).select('name rollNumber email +faceDescriptor');

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No registered students found',
      });
    }

    // Calculate euclidean distance for each student
    let bestMatch = null;
    let bestDistance = Infinity;

    students.forEach((student) => {
      const distance = euclideanDistance(faceDescriptor, student.faceDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }
    });

    if (bestDistance < threshold) {
      res.json({
        success: true,
        matched: true,
        student: {
          id: bestMatch._id,
          name: bestMatch.name,
          rollNumber: bestMatch.rollNumber,
          email: bestMatch.email,
        },
        confidence: 1 - bestDistance,
        distance: bestDistance,
      });
    } else {
      res.json({
        success: true,
        matched: false,
        error: 'No matching face found',
        bestDistance,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Helper function to calculate euclidean distance
function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}
