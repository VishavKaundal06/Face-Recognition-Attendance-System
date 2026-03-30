const Student = require('../models/Student');
const { logAudit } = require('../utils/audit');

const parseCsvRows = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line
      .split(',')
      .map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
};

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
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
        error: 'Student not found'
      });
    }
    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Register student with face
exports.registerStudent = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      phone,
      course,
      branch,
      year,
      department,
      semester,
      faceDescriptor
    } = req.body;

    const resolvedBranch = branch || department;
    const resolvedYear = year ?? semester;
    const parsedYear = resolvedYear !== undefined ? parseInt(resolvedYear, 10) : undefined;

    if (!resolvedBranch || Number.isNaN(parsedYear) || parsedYear === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Branch and year are required'
      });
    }

    // Check if student exists
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: 'Student with this roll number already exists'
      });
    }

    const student = new Student({
      name,
      rollNumber,
      email,
      phone,
      course,
      branch: branch || department,
      year: year ?? semester,
      faceDescriptor: faceDescriptor || []
    });

    await student.save();

    await logAudit({
      req,
      action: 'student.created',
      entityType: 'student',
      entityId: student._id,
      metadata: { rollNumber: student.rollNumber }
    });

    res.status(201).json({
      success: true,
      data: sanitizeStudent(student),
      message: 'Student registered successfully'
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: `Duplicate value for ${field}`
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Self-register student with face (public route)
exports.selfRegisterStudent = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      phone,
      course,
      branch,
      year,
      department,
      semester,
      faceDescriptor
    } = req.body;

    const resolvedBranch = branch || department;
    const resolvedYear = year ?? semester;
    const parsedYear = resolvedYear !== undefined ? parseInt(resolvedYear, 10) : undefined;

    if (!resolvedBranch || Number.isNaN(parsedYear) || parsedYear === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Branch and year are required'
      });
    }

    // Check if student exists
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: 'Student with this roll number already exists'
      });
    }

    const student = new Student({
      name,
      rollNumber,
      email,
      phone,
      course,
      branch: branch || department,
      year: year ?? semester,
      faceDescriptor: faceDescriptor || []
    });

    await student.save();

    await logAudit({
      req,
      action: 'student.self_registered',
      entityType: 'student',
      entityId: student._id,
      metadata: { rollNumber: student.rollNumber, selfRegistered: true }
    });

    res.status(201).json({
      success: true,
      data: sanitizeStudent(student),
      message: 'Student successfully registered'
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: `Duplicate value for ${field}`
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { name, email, phone, course, branch, year, department, semester, faceDescriptor } = req.body;

    const updateData = { ...req.body };
    delete updateData.rollNumber; // Roll number should not be updated via this endpoint usually

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-faceDescriptor');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: sanitizeStudent(student),
      message: 'Student updated successfully'
    });

    await logAudit({
      req,
      action: 'student.updated',
      entityType: 'student',
      entityId: student._id,
      metadata: { rollNumber: student.rollNumber }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: `Duplicate value for ${field}`
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
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
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });

    await logAudit({
      req,
      action: 'student.deleted',
      entityType: 'student',
      entityId: student._id,
      metadata: { rollNumber: student.rollNumber }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Import students from CSV
exports.importStudents = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    const csvText = req.file.buffer.toString('utf8');
    const rows = parseCsvRows(csvText);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: 'No rows found in CSV'
      });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const [index, row] of rows.entries()) {
      const name = row.name || row.studentname || '';
      const rollNumber = row.rollnumber || row.roll || '';
      const email = row.email || '';
      const phone = row.phone || row.phonenumber || '';
      const course = row.course || '';
      const branch = row.branch || row.department || '';
      const year = row.year || row.semester || '';

      if (!name || !rollNumber || !email || !phone || !course || !branch || !year) {
        results.skipped += 1;
        results.errors.push({
          row: index + 2,
          error: 'Missing required fields'
        });
        continue;
      }

      try {
        await Student.create({
          name,
          rollNumber,
          email,
          phone,
          course,
          branch,
          year: parseInt(year, 10)
        });
        results.created += 1;
      } catch (error) {
        results.skipped += 1;
        let message = error.message;
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern || {})[0] || 'field';
          message = `Duplicate ${field}: ${row[field] || row.rollnumber || row.email || 'unknown'}`;
        }
        results.errors.push({
          row: index + 2,
          error: message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });

    await logAudit({
      req,
      action: 'student.imported',
      entityType: 'student',
      metadata: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
        error: 'Face descriptor is required'
      });
    }

    // Get all students with face descriptors
    const students = await Student.find({
      isActive: true,
      faceDescriptor: { $exists: true, $ne: [] }
    }).select('name rollNumber email +faceDescriptor');

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No registered students found'
      });
    }

    // Calculate euclidean distance for each student
    let bestMatch = null;
    let bestDistance = Infinity;

    students.forEach((student) => {
      // Ensure faceDescriptor is a plain array if it's a Mongoose array
      const descriptor = Array.isArray(student.faceDescriptor)
        ? student.faceDescriptor
        : Array.from(student.faceDescriptor || []);

      const distance = euclideanDistance(faceDescriptor, descriptor);
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
          email: bestMatch.email
        },
        confidence: 1 - bestDistance,
        distance: bestDistance
      });
    } else {
      res.json({
        success: true,
        matched: false,
        error: 'No matching face found',
        bestDistance
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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

// Get attendance for current logged-in student
exports.getMyAttendance = async (req, res) => {
  try {
    const User = require('../models/User');
    const Attendance = require('../models/Attendance');
    const user = await User.findById(req.user.userId);
    const student = await Student.findOne({ email: user.email, isActive: true });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
      student: sanitizeStudent(student)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

