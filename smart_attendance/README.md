# HPTU Attendance System - Face Recognition

A Python-based HPTU attendance system that uses facial recognition to automatically mark attendance via webcam.

## Features

✨ **Core Features:**
- Real-time face detection and recognition using webcam
- Automatic attendance marking with timestamp
- Face registration for new users
- Attendance logging to CSV files
- Daily attendance reports and summaries
- Confidence-based recognition filtering

🎯 **Technical Highlights:**
- Uses `face_recognition` library (dlib-based)
- OpenCV for video capture and visualization
- Support for both fast (HOG) and accurate (CNN) detection models
- Cooldown mechanism to prevent duplicate marking
- Face encoding caching for performance

## Installation

### Prerequisites
- Python 3.7+
- Webcam
- macOS/Linux/Windows

### Setup Steps

1. **Clone/Create the project directory:**
```bash
cd /Users/vishavkaundal/Desktop/project/smart_attendance
```

2. **Create a virtual environment (recommended):**
```bash
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies:**
```bash
python3 -m pip install -r requirements.txt
```

## Project Operations (Web + API)

Use these from project root:

```bash
npm start            # Start backend + frontend + admin
npm run status       # Process + port + health snapshot
npm run ready        # doctor + status + smoke in one command
npm run down         # Stop all managed services
```

If you want full DB-backed APIs, configure MongoDB:

```bash
npm run mongo:doctor
npm run mongo:start
```

Or configure remote MongoDB URI:

```bash
npm run mongo:use-remote -- "mongodb+srv://USER:PASS@cluster.mongodb.net/smart_attendance"
```

Standalone Python app helpers:

```bash
npm run py:setup
npm run py:start
```

## Usage

### 1. Register Faces

Start the application:
```bash
python3 main.py
```

Choose option **1: Register new face**
- Enter the person's name
- Specify number of samples (recommended: 5+)
- Press SPACE to capture each sample
- Press Q to cancel

The system will save face images to `data/known_faces/[name]/`

### 2. Encode Faces

Choose option **4: Encode registered faces**

This processes all registered faces and creates optimized encodings for fast recognition. Done automatically after registration but can be rerun.

### 3. Start Attendance

Choose option **3: Start attendance marking**
- Set confidence threshold (0.6 is good for most cases)
- Select detection model:
  - `hog`: Faster, good for CPU
  - `cnn`: More accurate, requires GPU (CUDA)
- Press Q to quit
- Press S to view attendance summary during session

The system will:
- Detect faces in real-time
- Match them against registered faces
- Automatically mark attendance if confidence exceeds threshold
- Display results with green boxes for recognized faces

### 4. View Attendance

Choose option **5: View today's attendance**

Displays a summary of all attendance records for the current day.

## Project Structure

```
smart_attendance/
├── main.py                      # Main application entry point
├── face_recognition_module.py   # Face detection & recognition
├── attendance_system.py         # Attendance logging
├── face_registration.py         # Face registration from webcam
├── requirements.txt             # Python dependencies
├── data/
│   ├── known_faces/            # Registered face images
│   │   ├── [person_name]/
│   │   │   ├── person_name_0.jpg
│   │   │   ├── person_name_1.jpg
│   │   │   └── ...
│   └── encodings/              # Pre-computed face encodings
│       └── face_encodings.pkl
└── logs/                        # Attendance records
    ├── attendance_2026-03-20.csv
    └── attendance_2026-03-21.csv
```

## Configuration

### Confidence Threshold
- **0.5-0.6**: Very permissive (more false positives)
- **0.6-0.7**: Balanced (recommended)
- **0.7-0.8**: Strict (fewer false positives)
- **0.8+**: Very strict (may miss some recognitions)

### Detection Model
- **hog**: CPU-efficient, ~50ms per frame
- **cnn**: GPU-efficient (if available), ~20ms per frame, more accurate

## Attendance Record Format

Each day creates a CSV file: `logs/attendance_YYYY-MM-DD.csv`

```csv
Name,Date,Time,Status
John Doe,2026-03-20,09:15:32,Present
Jane Smith,2026-03-20,09:18:45,Present
```

## Tips & Best Practices

1. **Registration Quality:**
   - Capture faces at different angles
   - Use varying lighting conditions
   - Ensure good image quality
   - Use at least 3-5 samples per person

2. **Recognition Accuracy:**
   - Ensure adequate lighting during attendance
   - Keep consistent camera angle
   - Remove glasses/accessories if possible during registration
   - Use CNN model for better accuracy if GPU available

3. **Performance:**
   - HOG model processes every 5th frame for speed
   - CNN model is more CPU intensive
   - Close unnecessary applications to improve responsiveness

## Troubleshooting

**Issue: "No encodings file found"**
- Solution: Register faces first (Option 1) and encode them (Option 4)

**Issue: Webcam not detected**
- Ensure webcam permissions are granted
- Check webcam is not in use by another application
- Try another USB port

**Issue: Low recognition accuracy**
- Register more face samples (8-10)
- Try the CNN model
- Register faces in different lighting
- Check face alignment during registration

**Issue: dlib build fails / CMake missing**
- Use prebuilt dlib wheel path (no Homebrew required):
```bash
python3 -m pip install --user dlib-bin
python3 -m pip install --user numpy==1.24.3 Pillow==10.0.0 opencv-python==4.8.1.78 click==8.1.8 face-recognition-models==0.3.0
python3 -m pip install --user face-recognition==1.3.0 --no-deps
```
- Then run:
```bash
python3 main.py
```

**Issue: `python` or `pip` command not found (exit code 127)**
- Use `python3` and `python3 -m pip` instead of `python`/`pip`.
- Or use project helpers:
```bash
npm run py:setup
npm run py:start
```

**Issue: Duplicate attendance marks**
- System has built-in cooldown (5 seconds)
- If needed, manually edit attendance CSV

## License

This project is open source and available for educational purposes.

## Support

For issues or questions, refer to the code comments or check the official documentation:
- [face_recognition](https://face-recognition.readthedocs.io/)
- [OpenCV](https://docs.opencv.org/)
