import express from 'express';
import { getAllAttendance } from '../models/attendance.js';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Export attendance as CSV
router.get('/csv', (req, res) => {
  const records = getAllAttendance();
  if (!records.length) return res.status(404).json({ error: 'No attendance records' });
  const parser = new Parser();
  const csv = parser.parse(records);
  const filename = `attendance_${Date.now()}.csv`;
  const filePath = path.join('reports', filename);
  fs.writeFileSync(filePath, csv);
  res.download(filePath, filename, () => {
    fs.unlinkSync(filePath);
  });
});

export default router;
