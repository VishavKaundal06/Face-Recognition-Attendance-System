from sqlalchemy import Column, Integer, String, Text, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=True)
    department = Column(String(100), nullable=True)
    face_encoding = Column(Text, nullable=True)   # JSON list of encoding floats
    photo_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attendances = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    status = Column(String(20), default="Present")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="attendances")
