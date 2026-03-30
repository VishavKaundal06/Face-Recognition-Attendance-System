import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cv from 'opencv4nodejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// POST /api/face/recognize
router.post('/recognize', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  try {
    const imgPath = req.file.path;
    const image = await cv.imreadAsync(imgPath);
    // Simple face detection using Haar Cascade (replace with recognition logic)
    const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
    const gray = await image.bgrToGrayAsync();
    const faces = await classifier.detectMultiScaleAsync(gray);
    if (!faces.objects.length) {
      return res.json({ recognized: false, message: 'No face detected' });
    }
    // Placeholder: always returns not recognized
    res.json({ recognized: false, message: 'Face detected, recognition not implemented' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
