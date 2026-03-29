"""
Configuration file for HPTU Attendance System
"""

# Face Recognition Settings
FACE_DETECTION_MODEL = 'hog'  # 'hog' (faster, CPU) or 'cnn' (accurate, GPU)
CONFIDENCE_THRESHOLD = 0.6     # 0.0-1.0, higher = stricter matching
FACE_MATCH_TOLERANCE = 0.4     # 0.0-1.0, lower = stricter matching

# Video Settings
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480
CAMERA_FPS = 30
FRAME_SKIP = 5                # Process every Nth frame for performance

# Attendance Settings
ATTENDANCE_COOLDOWN = 5       # Seconds between marking same person
ENABLE_AUTO_SAVE = True       # Auto-save attendance records
MARKS_OUTSIDE_TIMEFRAME = False  # Allow marking attendance at any time

# Directory Paths
KNOWN_FACES_DIR = 'data/known_faces'
ENCODINGS_DIR = 'data/encodings'
ENCODINGS_FILE = 'data/encodings/face_encodings.pkl'
LOGS_DIR = 'logs'

# Display Settings
SHOW_FPS = True
SHOW_CONFIDENCE = True
BOX_COLOR_RECOGNIZED = (0, 255, 0)    # Green (BGR)
BOX_COLOR_UNKNOWN = (0, 0, 255)       # Red (BGR)
BOX_THICKNESS = 2
FONT_SIZE = 0.6

# Registration Settings
DEFAULT_SAMPLES = 5           # Default number of samples per person
SAMPLE_INTERVAL = 0.5         # Seconds between auto-capture samples
