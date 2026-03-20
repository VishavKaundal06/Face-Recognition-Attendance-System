const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, status = 'present', confidence, photo, remarks } = req.body;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    // Check if already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyMarked = await Attendance.findOne({
      studentId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (alreadyMarked) {
      return res.status(400).json({
        success: false,
        error: 'Attendance already marked for today',
        data: alreadyMarked,
      });
    }

    const attendance = new Attendance({
      studentId,
      studentName: student.name,
      rollNumber: student.rollNumber,
      date: today,
      timeIn: new Date(),
      status,
      confidence,
      photo,
      remarks,
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Public: recent attendance lookup (optionally by roll number and/or date)
exports.getRecentAttendance = async (req, res) => {
  try {
    const { rollNumber, date, limit = 20 } = req.query;

    const filter = {};

    if (rollNumber) {
      filter.rollNumber = rollNumber;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const records = await Attendance.find(filter)
      .sort({ timeIn: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get attendance by date
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).populate('studentId', 'name rollNumber email');

    res.json({
      success: true,
      data: attendance,
      count: attendance.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get student attendance
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    let filter = { studentId };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(filter).sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
      count: attendance.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, date } = req.query;

    let filter = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('studentId', 'name rollNumber email');

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const totalPresent = await Attendance.countDocuments({
      ...filter,
      status: 'present',
    });

    const totalAbsent = await Attendance.countDocuments({
      ...filter,
      status: 'absent',
    });

    const totalLate = await Attendance.countDocuments({
      ...filter,
      status: 'late',
    });

    const totalLeave = await Attendance.countDocuments({
      ...filter,
      status: 'leave',
    });

    const totalRecords = await Attendance.countDocuments(filter);

    const presentPercentage =
      totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(2) : '0.00';

    res.json({
      success: true,
      data: {
        totalRecords,
        totalPresent,
        totalAbsent,
        totalLate,
        totalLeave,
        presentPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get attendance report (range + grouped insights)
exports.getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    const filter = {
      date: {
        $gte: rangeStart,
        $lte: rangeEnd,
      },
    };

    const records = await Attendance.find(filter).sort({ date: -1 }).lean();

    const totalRecords = records.length;
    const statusCounts = records.reduce(
      (acc, record) => {
        const key = record.status || 'present';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0, leave: 0 }
    );

    const byStudentMap = new Map();
    const byDayMap = new Map();

    records.forEach((record) => {
      const studentKey = record.rollNumber || String(record.studentId);
      if (!byStudentMap.has(studentKey)) {
        byStudentMap.set(studentKey, {
          studentId: record.studentId,
          studentName: record.studentName,
          rollNumber: record.rollNumber,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
        });
      }

      const studentAgg = byStudentMap.get(studentKey);
      const studentStatus = record.status || 'present';
      studentAgg[studentStatus] = (studentAgg[studentStatus] || 0) + 1;
      studentAgg.total += 1;

      const dateKey = new Date(record.date).toISOString().split('T')[0];
      if (!byDayMap.has(dateKey)) {
        byDayMap.set(dateKey, {
          date: dateKey,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
        });
      }

      const dayAgg = byDayMap.get(dateKey);
      dayAgg[studentStatus] = (dayAgg[studentStatus] || 0) + 1;
      dayAgg.total += 1;
    });

    const presentPercentage =
      totalRecords > 0 ? ((statusCounts.present / totalRecords) * 100).toFixed(2) : '0.00';

    const byStudent = Array.from(byStudentMap.values()).sort((a, b) =>
      String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''))
    );

    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        range: { startDate, endDate },
        totals: {
          records: totalRecords,
          present: statusCounts.present || 0,
          absent: statusCounts.absent || 0,
          late: statusCounts.late || 0,
          leave: statusCounts.leave || 0,
          presentPercentage,
          uniqueStudents: byStudent.length,
        },
        byStudent,
        byDay,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
