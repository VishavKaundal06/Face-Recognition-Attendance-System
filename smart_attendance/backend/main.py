"""
Main FastAPI Application
------------------------
AI Face Recognition Attendance System Backend
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import create_tables, SessionLocal
from face_engine import face_cache
from routers import users, attendance, reports

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Face Recognition Attendance System backend...")
    create_tables()
    # Pre-load face encodings
    db = SessionLocal()
    try:
        face_cache.load_from_db(db)
    finally:
        db.close()
    logger.info("Face encodings loaded. Server ready.")
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="AI Face Recognition Attendance System",
    description="Backend API for automated face recognition-based attendance tracking",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow React dev server and all common local ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://localhost:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos as static files
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Include routers
app.include_router(users.router)
app.include_router(attendance.router)
app.include_router(reports.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "OK",
        "message": "AI Face Recognition Attendance System is running",
        "known_faces": len(face_cache.known_encodings),
    }


# ─── WebSocket for Real-Time Recognition ───────────────────────
class ConnectionManager:
    """Manages active WebSocket connections."""
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        import json
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws/attendance")
async def websocket_attendance(websocket: WebSocket):
    """
    WebSocket endpoint for real-time attendance updates.
    Clients connect here to receive live attendance events.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Wait for messages from client (keep alive pings)
            data = await websocket.receive_text()
            # Echo back to confirm connection is alive
            await websocket.send_json({"type": "pong", "message": "Connection alive"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
