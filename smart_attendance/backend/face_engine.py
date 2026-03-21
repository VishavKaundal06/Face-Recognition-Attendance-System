"""
Face Recognition Engine
-----------------------
Handles:
  - Encoding faces from image bytes
  - Loading stored encodings from DB
  - Recognizing faces in a video frame
"""

import face_recognition
import numpy as np
import json
import base64
import io
import logging
from PIL import Image

logger = logging.getLogger(__name__)

TOLERANCE = 0.5   # Lower = stricter match (0.4-0.6 recommended)
MODEL = "hog"     # "hog" (CPU, fast) or "cnn" (GPU, more accurate)


def decode_image(image_b64: str) -> np.ndarray:
    """Decode a base64 JPEG/PNG string into an RGB numpy array."""
    img_bytes = base64.b64decode(image_b64)
    pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(pil_image)


def bytes_to_rgb(image_bytes: bytes) -> np.ndarray:
    """Convert raw bytes to an RGB numpy array."""
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(pil_image)


def encode_face_from_bytes(image_bytes: bytes) -> list | None:
    """
    Detect a face in image_bytes and return its encoding as a list.
    Returns None if no face is detected.
    """
    rgb_image = bytes_to_rgb(image_bytes)
    face_locations = face_recognition.face_locations(rgb_image, model=MODEL)
    if not face_locations:
        return None
    encodings = face_recognition.face_encodings(rgb_image, face_locations)
    if not encodings:
        return None
    return encodings[0].tolist()


def recognize_in_frame(
    image_b64: str,
    known_encodings: list[np.ndarray],
    known_user_ids: list[int],
    known_names: list[str],
) -> dict:
    """
    Run face recognition on a frame (base64).

    Returns:
        {
          "recognized": bool,
          "user_id": int | None,
          "name": str | None,
          "confidence": float | None,   # 1 - distance (higher=better)
          "face_locations": list        # (top, right, bottom, left) for each face
        }
    """
    result = {
        "recognized": False,
        "user_id": None,
        "name": None,
        "confidence": None,
        "face_locations": [],
    }

    try:
        rgb_image = decode_image(image_b64)
        face_locations = face_recognition.face_locations(rgb_image, model=MODEL)
        result["face_locations"] = face_locations

        if not face_locations:
            return result

        frame_encodings = face_recognition.face_encodings(rgb_image, face_locations)

        if not frame_encodings or not known_encodings:
            return result

        # Use only first detected face for primary recognition
        frame_enc = frame_encodings[0]
        face_distances = face_recognition.face_distance(known_encodings, frame_enc)
        best_match_idx = int(np.argmin(face_distances))
        best_distance = float(face_distances[best_match_idx])

        if best_distance <= TOLERANCE:
            result["recognized"] = True
            result["user_id"] = known_user_ids[best_match_idx]
            result["name"] = known_names[best_match_idx]
            result["confidence"] = round((1 - best_distance) * 100, 2)

    except Exception as e:
        logger.error(f"Error in recognize_in_frame: {e}")

    return result


class FaceEngineCache:
    """In-memory cache of known face encodings to avoid repeated DB reads."""

    def __init__(self):
        self.known_encodings: list[np.ndarray] = []
        self.known_user_ids: list[int] = []
        self.known_names: list[str] = []

    def load_from_db(self, db_session):
        """Load all user face encodings from the database."""
        from models import User
        users = db_session.query(User).filter(User.face_encoding.isnot(None)).all()
        self.known_encodings = []
        self.known_user_ids = []
        self.known_names = []
        for user in users:
            try:
                enc = np.array(json.loads(user.face_encoding))
                self.known_encodings.append(enc)
                self.known_user_ids.append(user.id)
                self.known_names.append(user.name)
            except Exception as e:
                logger.warning(f"Could not load encoding for user {user.id}: {e}")
        logger.info(f"Loaded {len(self.known_encodings)} face encodings from DB.")

    def recognize(self, image_b64: str) -> dict:
        return recognize_in_frame(
            image_b64,
            self.known_encodings,
            self.known_user_ids,
            self.known_names,
        )


# Global singleton cache
face_cache = FaceEngineCache()
