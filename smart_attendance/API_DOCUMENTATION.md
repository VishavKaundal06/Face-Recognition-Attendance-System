# HPTU Attendance API Documentation

Base URL: `http://localhost:5050/api`

## Health

### GET /health
Backend liveness check.

Example response:
```json
{
  "status": "Backend is running (degraded: mongodb unavailable)",
  "mongodb": "connecting",
  "degraded": true
}
```

### GET /health/detailed
Detailed health checks including MongoDB connection state.

## Auth

### POST /auth/register
Create admin/teacher/staff user.

Request:
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

### POST /auth/login
Login and get JWT token.

Response:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### GET /auth/me
Protected. Returns current authenticated user profile from token.

Headers:
```json
{
  "Authorization": "Bearer <jwt>"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

## Students

### GET /students
Protected. Get all active students.

### GET /students/:id
Protected. Get one student.

### POST /students/register
Protected. Register student + face descriptor.

`faceDescriptor` must be either empty/missing or a numeric array of length `128`.

Request:
```json
{
  "name": "John Doe",
  "rollNumber": "CSE-101",
  "email": "john@example.com",
  "department": "CSE",
  "semester": 4,
  "faceDescriptor": [0.0123, -0.0844, 0.2111, "... total 128 numeric values ..."]
}
```

Note: student responses do not expose `faceDescriptor`.

### PUT /students/:id
Protected. Update student info.

### DELETE /students/:id
Protected. Soft delete student (`isActive=false`).

### POST /students/recognize
Public. Match input descriptor with registered students.

Request:
```json
{
  "faceDescriptor": [0.0123, -0.0844, 0.2111, "... total 128 numeric values ..."],
  "threshold": 0.6
}
```

Response (match):
```json
{
  "success": true,
  "matched": true,
  "student": {
    "id": "...",
    "name": "John Doe",
    "rollNumber": "CSE-101",
    "email": "john@example.com"
  },
  "confidence": 0.92,
  "distance": 0.08
}
```

---

## Attendance

### POST /attendance/mark
Public. Mark student attendance.

Request:
```json
{
  "studentId": "<studentId>",
  "status": "present",
  "confidence": 95,
  "photo": "data:image/jpeg;base64,...",
  "remarks": "Marked via face recognition"
}
```

### GET /attendance/date/:date
Protected. Get attendance by date (`YYYY-MM-DD`).

### GET /attendance/recent
Public. Get recent attendance records for student-side status view.

Optional query:
- `date` (YYYY-MM-DD)
- `rollNumber`
- `limit` (default 20, max 100)

### GET /attendance/student/:studentId
Protected. Get attendance history of a student.
Optional query: `startDate`, `endDate`.

### GET /attendance
Protected. Paginated attendance list.
Optional query: `page`, `limit`, `date`.

### GET /attendance/stats/summary
Protected. Summary stats.
Optional query: `startDate`, `endDate`.

Includes: `totalPresent`, `totalAbsent`, `totalLate`, `totalLeave`, `presentPercentage`.

### GET /attendance/report
Protected. Detailed report for date range.

Query:
- `startDate` (required, YYYY-MM-DD)
- `endDate` (required, YYYY-MM-DD)

Response includes:
- `totals` (present/absent/late/leave, percentage, unique students)
- `byStudent` (per-student status counts)
- `byDay` (daily status counts)

---

## Common Errors

```json
{
  "success": false,
  "error": "Message"
}
```

Status codes used: `400`, `401`, `403`, `404`, `500`, `503`.

## Degraded Mode Behavior

When `/health` returns `"degraded": true`:

- `GET /health` and `GET /health/detailed` continue to work.
- DB-dependent endpoints (`/auth`, `/students`, `/attendance`) return `503`.
- UI pages can load, but login/registration/recognition/attendance writes require MongoDB.

When backend is started with degraded mode and MongoDB is unavailable, DB-dependent endpoints return:

```json
{
  "success": false,
  "error": "Database unavailable",
  "message": "Service is running in degraded mode. Connect MongoDB to use this endpoint."
}
```

Validation errors return:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```
