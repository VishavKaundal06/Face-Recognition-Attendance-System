import express from 'express';
import {
  listAttendance,
  createAttendance,
  getAttendance,
  deleteAttendanceHandler
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/', listAttendance);
router.post('/', createAttendance);
router.get('/:id', getAttendance);
router.delete('/:id', deleteAttendanceHandler);

export default router;
