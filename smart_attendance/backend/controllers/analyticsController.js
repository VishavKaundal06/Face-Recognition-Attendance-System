const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Get daily attendance trends for the last 7 days
exports.getDailyTrends = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trends = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get stats by course/branch
exports.getClassStats = async (req, res) => {
  try {
    const stats = await Student.aggregate([
      {
        $group: {
          _id: { course: "$course", branch: "$branch" },
          totalStudents: { $sum: 1 }
        }
      }
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get defaulters (attendance < 75%)
// Note: This is a simplified calculation for demo
exports.getDefaulters = async (req, res) => {
  try {
    const threshold = 0.75;
    // For real implementation, we'd compare (number of attendance days) / (total working days)
    // Here we'll just mock find students with less than 5 attendance records for simplicity
    const defaulters = await Student.aggregate([
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'studentId',
          as: 'attendanceRecords'
        }
      },
      {
        $project: {
          name: 1,
          rollNumber: 1,
          email: 1,
          attendanceCount: { $size: "$attendanceRecords" }
        }
      },
      {
        $match: {
          attendanceCount: { $lt: 5 } // Mock threshold
        }
      }
    ]);

    res.json({ success: true, data: defaulters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export attendance to CSV
exports.exportCSV = async (req, res) => {
  try {
    const attendance = await Attendance.find().lean();
    const fields = ['studentName', 'rollNumber', 'date', 'status', 'confidence'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(attendance);

    res.header('Content-Type', 'text/csv');
    res.attachment('attendance_report.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export attendance to PDF
exports.exportPDF = async (req, res) => {
  try {
    const attendance = await Attendance.find().lean();
    const doc = new PDFDocument();
    
    res.header('Content-Type', 'application/pdf');
    res.attachment('attendance_report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();

    attendance.forEach(record => {
      doc.fontSize(12).text(`${record.studentName} (${record.rollNumber}) - ${new Date(record.date).toLocaleDateString()} : ${record.status}`);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
