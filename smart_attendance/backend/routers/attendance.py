"""
Attendance Router
-----------------
Endpoints for:
  - Recognizing a face and marking attendance (POST /recognize)
  - Listing attendance records (GET /)
  - Getting today's summary (GET /today)
  - Dashboard stats (GET /stats)
"""

import json
from datetime import date, datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from database import get_db
from face_engine import face_cache
from models import Attendance, User
from schemas import AttendanceResponse, DashboardStats, RecognizeResponse

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


def _attendance_to_response(att: Attendance) -> AttendanceResponse:
    return AttendanceResponse(
        id=att.id,
        user_id=att.user_id,
        date=att.date,
        time=att.time,
        status=att.status,
        created_at=att.created_at,
        user_name=att.user.name if att.user else None,
        user_employee_id=att.user.employee_id if att.user else None,
        user_department=att.user.department if att.user else None,
    )


# ─── Recognize & Mark Attendance ───────────────────────────────
@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_face(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Expects JSON body: { "image_b64": "<base64 string>" }
    Recognizes a face and marks attendance if:
      1. Face is recognized
      2. Attendance hasn't been marked today already
    """
    image_b64 = payload.get("image_b64")
    if not image_b64:
        raise HTTPException(status_code=400, detail="image_b64 is required")

    # Ensure cache is populated
    if not face_cache.known_encodings:
        face_cache.load_from_db(db)

    result = face_cache.recognize(image_b64)

    if not result["recognized"]:
        return RecognizeResponse(
            recognized=False,
            message="Face not recognized or no face detected",
        )

    user_id = result["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RecognizeResponse(recognized=False, message="User not found in database")

    today = date.today()
    now_time = datetime.now().time()

    # Check if already marked today
    existing = (
        db.query(Attendance)
        .filter(and_(Attendance.user_id == user_id, Attendance.date == today))
        .first()
    )
    if existing:
        return RecognizeResponse(
            recognized=True,
            user_id=user_id,
            name=user.name,
            employee_id=user.employee_id,
            department=user.department,
            confidence=result["confidence"],
            attendance_marked=False,
            already_marked=True,
            message=f"Attendance already marked for {user.name} today",
        )

    # Mark attendance
    attendance = Attendance(
        user_id=user_id,
        date=today,
        time=now_time,
        status="Present",
    )
    db.add(attendance)
    db.commit()

    return RecognizeResponse(
        recognized=True,
        user_id=user_id,
        name=user.name,
        employee_id=user.employee_id,
        department=user.department,
        confidence=result["confidence"],
        attendance_marked=True,
        already_marked=False,
        message=f"Attendance marked for {user.name}",
    )


# ─── List Attendance ───────────────────────────────────────────
@router.get("/", response_model=List[AttendanceResponse])
def list_attendance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Attendance)
    if start_date:
        q = q.filter(Attendance.date >= start_date)
    if end_date:
        q = q.filter(Attendance.date <= end_date)
    if user_id:
        q = q.filter(Attendance.user_id == user_id)
    records = q.order_by(Attendance.date.desc(), Attendance.time.desc()).all()
    return [_attendance_to_response(r) for r in records]


# ─── Today's Attendance ────────────────────────────────────────
@router.get("/today", response_model=List[AttendanceResponse])
def get_today_attendance(db: Session = Depends(get_db)):
    today = date.today()
    records = (
        db.query(Attendance)
        .filter(Attendance.date == today)
        .order_by(Attendance.time.desc())
        .all()
    )
    return [_attendance_to_response(r) for r in records]


# ─── Dashboard Stats ───────────────────────────────────────────
@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    today = date.today()
    present_today = (
        db.query(Attendance).filter(Attendance.date == today).count()
    )
    absent_today = total_users - present_today
    rate = (present_today / total_users * 100) if total_users > 0 else 0.0
    return DashboardStats(
        total_users=total_users,
        present_today=present_today,
        absent_today=absent_today,
        attendance_rate=round(rate, 1),
    )


# ─── Delete Attendance Record ──────────────────────────────────
@router.delete("/{attendance_id}", status_code=204)
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(record)
    db.commit()
