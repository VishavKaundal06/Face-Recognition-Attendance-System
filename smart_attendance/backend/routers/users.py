"""
Users Router
------------
Endpoints for registering, listing, updating and deleting users.
Also handles face image upload and re-encoding.
"""

import json
import os
import shutil
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from face_engine import encode_face_from_bytes, face_cache
from models import User
from schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/api/users", tags=["Users"])

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def _save_photo(file: UploadFile) -> str:
    filename = f"{uuid.uuid4().hex}{os.path.splitext(file.filename or '.jpg')[1]}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return filepath


# ─── Register User ─────────────────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(
    name: str = Form(...),
    employee_id: str = Form(...),
    email: str = Form(None),
    department: str = Form(None),
    face_image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Check duplicate employee_id
    existing = db.query(User).filter(User.employee_id == employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Employee ID '{employee_id}' already registered.")

    image_bytes = await face_image.read()
    encoding = encode_face_from_bytes(image_bytes)
    if encoding is None:
        raise HTTPException(
            status_code=422,
            detail="No face detected in the uploaded image. Please use a clear, front-facing photo.",
        )

    # Save photo
    face_image.file.seek(0)
    photo_path = _save_photo(face_image)

    user = User(
        name=name,
        employee_id=employee_id,
        email=email,
        department=department,
        face_encoding=json.dumps(encoding),
        photo_path=photo_path,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Refresh cache
    face_cache.load_from_db(db)

    return UserResponse(
        id=user.id,
        name=user.name,
        employee_id=user.employee_id,
        email=user.email,
        department=user.department,
        photo_path=user.photo_path,
        created_at=user.created_at,
        has_face_encoding=True,
    )


# ─── List Users ────────────────────────────────────────────────
@router.get("/", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        UserResponse(
            id=u.id,
            name=u.name,
            employee_id=u.employee_id,
            email=u.email,
            department=u.department,
            photo_path=u.photo_path,
            created_at=u.created_at,
            has_face_encoding=u.face_encoding is not None,
        )
        for u in users
    ]


# ─── Get Single User ───────────────────────────────────────────
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id,
        name=user.name,
        employee_id=user.employee_id,
        email=user.email,
        department=user.department,
        photo_path=user.photo_path,
        created_at=user.created_at,
        has_face_encoding=user.face_encoding is not None,
    )


# ─── Update User ───────────────────────────────────────────────
@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, updates: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if updates.name is not None:
        user.name = updates.name
    if updates.email is not None:
        user.email = updates.email
    if updates.department is not None:
        user.department = updates.department
    db.commit()
    db.refresh(user)
    face_cache.load_from_db(db)
    return UserResponse(
        id=user.id,
        name=user.name,
        employee_id=user.employee_id,
        email=user.email,
        department=user.department,
        photo_path=user.photo_path,
        created_at=user.created_at,
        has_face_encoding=user.face_encoding is not None,
    )


# ─── Delete User ───────────────────────────────────────────────
@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Delete photo file
    if user.photo_path and os.path.exists(user.photo_path):
        os.remove(user.photo_path)
    db.delete(user)
    db.commit()
    face_cache.load_from_db(db)


# ─── Update Face Image ─────────────────────────────────────────
@router.post("/{user_id}/update-face", response_model=UserResponse)
async def update_face(
    user_id: int,
    face_image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    image_bytes = await face_image.read()
    encoding = encode_face_from_bytes(image_bytes)
    if encoding is None:
        raise HTTPException(status_code=422, detail="No face detected in the uploaded image.")

    user.face_encoding = json.dumps(encoding)

    # Update photo file
    face_image.file.seek(0)
    if user.photo_path and os.path.exists(user.photo_path):
        os.remove(user.photo_path)
    user.photo_path = _save_photo(face_image)

    db.commit()
    db.refresh(user)
    face_cache.load_from_db(db)
    return UserResponse(
        id=user.id,
        name=user.name,
        employee_id=user.employee_id,
        email=user.email,
        department=user.department,
        photo_path=user.photo_path,
        created_at=user.created_at,
        has_face_encoding=True,
    )
