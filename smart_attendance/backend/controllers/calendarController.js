const Holiday = require('../models/Holiday');
const { logAudit } = require('../utils/audit');

exports.listHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find({}).sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { title, date, type = 'holiday', description } = req.body;
    const holiday = await Holiday.create({ title, date, type, description });

    await logAudit({
      req,
      action: 'holiday.created',
      entityType: 'holiday',
      entityId: holiday._id,
      metadata: { title, date, type }
    });

    res.status(201).json({ success: true, data: holiday });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) {
      return res.status(404).json({ success: false, error: 'Holiday not found' });
    }

    await logAudit({
      req,
      action: 'holiday.deleted',
      entityType: 'holiday',
      entityId: id
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMyTimetable = async (req, res) => {
  try {
    const User = require('../models/User');
    const Student = require('../models/Student');
    const Timetable = require('../models/Timetable');

    const user = await User.findById(req.user.userId);
    const student = await Student.findOne({ email: user.email, isActive: true });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const timetable = await Timetable.find({
      course: student.course,
      branch: student.branch
    }).sort({ dayOfWeek: 1, startTime: 1 });

    res.json({ success: true, data: timetable });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

