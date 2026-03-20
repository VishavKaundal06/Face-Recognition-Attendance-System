require('dotenv').config({ path: require('path').resolve(__dirname, '.env'), override: true });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');

const app = express();

const pidDir = path.resolve(__dirname, '..', '.pids');
const pidFile = path.join(pidDir, 'backend.pid');

function writePidFile() {
  try {
    fs.mkdirSync(pidDir, { recursive: true });
    fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  } catch (e) {
    console.warn(`Warning: failed to write PID file (${pidFile}): ${e.message}`);
  }
}

function cleanupPidFile() {
  try {
    if (!fs.existsSync(pidFile)) return;
    const raw = fs.readFileSync(pidFile, 'utf8').trim();
    if (raw === String(process.pid)) {
      fs.rmSync(pidFile, { force: true });
    }
  } catch {
    // ignore
  }
}

process.on('exit', cleanupPidFile);
process.on('SIGINT', () => {
  cleanupPidFile();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupPidFile();
  process.exit(0);
});

mongoose.set('bufferCommands', false);

const stateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Connect to database
connectDB();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:8000,http://localhost:8001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use('/api', apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mongoStateCode = mongoose.connection.readyState;
  const mongoState = stateMap[mongoStateCode] || 'unknown';
  const degraded = mongoState !== 'connected';

  res.json({
    status: degraded ? 'Backend is running (degraded: mongodb unavailable)' : 'Backend is running',
    mongodb: mongoState,
    degraded,
  });
});

app.get('/api/health/detailed', (req, res) => {
  const mongoStateCode = mongoose.connection.readyState;
  const mongoState = stateMap[mongoStateCode] || 'unknown';

  res.json({
    success: true,
    service: 'smart-attendance-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    checks: {
      backend: 'ok',
      mongodb: mongoState,
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  writePidFile();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
