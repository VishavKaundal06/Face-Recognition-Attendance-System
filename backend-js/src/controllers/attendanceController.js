import { getAllAttendance, addAttendance, getAttendanceById, deleteAttendance } from '../models/attendance.js';
import { v4 as uuidv4 } from 'uuid';

export function listAttendance(req, res) {
  res.json(getAllAttendance());
}

export function createAttendance(req, res) {
  const { userId, status } = req.body;
  if (!userId || !status) return res.status(400).json({ error: 'userId and status required' });
  const record = { id: uuidv4(), userId, status, timestamp: new Date().toISOString() };
  addAttendance(record);
  res.status(201).json(record);
}

export function getAttendance(req, res) {
  const record = getAttendanceById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Attendance record not found' });
  res.json(record);
}

export function deleteAttendanceHandler(req, res) {
  const ok = deleteAttendance(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Attendance record not found' });
  res.status(204).send();
}
