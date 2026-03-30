from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time, datetime


# ─── User Schemas ──────────────────────────────────────────────
class UserBase(BaseModel):
    name: str
    employee_id: str
    email: Optional[str] = None
    department: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None


class UserResponse(UserBase):
    id: int
    photo_path: Optional[str] = None
    created_at: datetime
    has_face_encoding: bool = False

    class Config:
        from_attributes = True


# ─── Attendance Schemas ────────────────────────────────────────
class AttendanceBase(BaseModel):
    user_id: int
    date: date
    time: time
    status: str = "Present"


class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    date: date
    time: time
    status: str
    created_at: datetime
    user_name: Optional[str] = None
    user_employee_id: Optional[str] = None
    user_department: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Recognition Schema ────────────────────────────────────────
class RecognizeRequest(BaseModel):
    image_b64: str   # base64 encoded JPEG frame


class RecognizeResponse(BaseModel):
    recognized: bool
    user_id: Optional[int] = None
    name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    confidence: Optional[float] = None
    attendance_marked: bool = False
    already_marked: bool = False
    message: str = ""


# ─── Dashboard Stats ───────────────────────────────────────────
class DashboardStats(BaseModel):
    total_users: int
    present_today: int
    absent_today: int
    attendance_rate: float
