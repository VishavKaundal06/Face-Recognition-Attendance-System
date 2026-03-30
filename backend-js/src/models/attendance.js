// Simple in-memory attendance model (replace with DB in production)
const attendanceRecords = [];

export function getAllAttendance() {
  return attendanceRecords;
}

export function addAttendance(record) {
  attendanceRecords.push(record);
  return record;
}

export function getAttendanceById(id) {
  return attendanceRecords.find(r => r.id === id);
}

export function deleteAttendance(id) {
  const idx = attendanceRecords.findIndex(r => r.id === id);
  if (idx !== -1) attendanceRecords.splice(idx, 1);
  return idx !== -1;
}
