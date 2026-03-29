// Configuration
const CONFIG = {
  API_URL: localStorage.getItem('apiUrl') || 'http://localhost:5050/api',
  THRESHOLD: parseFloat(localStorage.getItem('threshold')) || 0.6,
  MODEL_URL: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/',
  AUTO_MARK: localStorage.getItem('autoMarkEnabled') === 'true',
  MULTI_FRAME: localStorage.getItem('multiFrameEnabled') !== 'false',
  LIVENESS: localStorage.getItem('livenessEnabled') === 'true',
  LOCATION: localStorage.getItem('locationEnabled') === 'true',
};

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const captureBtn = document.getElementById('captureBtn');
const detectionStatus = document.getElementById('detectionStatus');
const resultBox = document.getElementById('result');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const studentInfo = document.getElementById('studentInfo');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const statusContent = document.getElementById('statusContent');
const refreshStatusBtn = document.getElementById('refreshStatusBtn');
const statusRollInput = document.getElementById('statusRollInput');
const multiFrameEnabledEl = document.getElementById('multiFrameEnabled');
const livenessEnabledEl = document.getElementById('livenessEnabled');
const locationEnabledEl = document.getElementById('locationEnabled');
const toggleThemeBtn = document.getElementById('toggleTheme');

let stream = null;
let detectionInterval = null;
let markInProgress = false;
let lastAutoMarkAt = 0;
const AUTO_MARK_COOLDOWN_MS = 15000;

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    
    tabBtns.forEach((b) => b.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'status') {
      loadAttendanceStatus();
    }
  });
});


function renderStatusRows(records) {
  if (!records.length) {
    statusContent.innerHTML = '<p>No attendance records found.</p>';
    return;
  }

  statusContent.innerHTML = `
    <table class="table" style="width:100%; border-collapse: collapse; background:#fff; border-radius: 8px; overflow:hidden;">
      <thead>
        <tr style="background:#f9f9f9;">
          <th style="padding:10px; text-align:left;">Name</th>
          <th style="padding:10px; text-align:left;">Roll Number</th>
          <th style="padding:10px; text-align:left;">Date</th>
          <th style="padding:10px; text-align:left;">Time</th>
          <th style="padding:10px; text-align:left;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${records
          .map(
            (record) => `
              <tr>
                <td style="padding:10px; border-bottom:1px solid #eee;">${record.studentName || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #eee;">${record.rollNumber || '-'}</td>
                <td style="padding:10px; border-bottom:1px solid #eee;">${new Date(record.date).toLocaleDateString()}</td>
                <td style="padding:10px; border-bottom:1px solid #eee;">${new Date(record.timeIn).toLocaleTimeString()}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-transform:capitalize;">${record.status || '-'}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function loadAttendanceStatus() {
  try {
    const rollNumber = statusRollInput?.value?.trim();
    const today = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({ date: today, limit: '30' });
    if (rollNumber) params.set('rollNumber', rollNumber);

    statusContent.innerHTML = '<p>Loading attendance status...</p>';

    const response = await fetch(`${CONFIG.API_URL}/attendance/recent?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 503) {
        throw new Error('Database unavailable. Attendance status is temporarily unavailable.');
      }
      throw new Error(data.error || 'Failed to load attendance status');
    }

    renderStatusRows(data.data || []);
  } catch (error) {
    statusContent.innerHTML = `<p>Failed to load status: ${error.message}</p>`;
  }
}

refreshStatusBtn?.addEventListener('click', loadAttendanceStatus);

function applyTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  if (toggleThemeBtn) {
    toggleThemeBtn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }
}

toggleThemeBtn?.addEventListener('click', () => {
  const current = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', current);
  applyTheme();
});

// Load face-api models
async function loadModels() {
  try {
    console.log('Loading face-api models...');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL),
    ]);
    console.log('✓ Models loaded successfully');
    detectionStatus.textContent = '✓ Ready - Click "Start Webcam" to begin';
  } catch (error) {
    console.error('Error loading models:', error);
    detectionStatus.textContent = '✗ Error loading models. Check console.';
  }
}


// Start webcam
startBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    
    video.srcObject = stream;
    video.addEventListener('play', startFaceDetection);
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    captureBtn.disabled = false;
    detectionStatus.textContent = '✓ Webcam started - Face detection active';
  } catch (error) {
    console.error('Error accessing webcam:', error);
    detectionStatus.textContent = '✗ Error: Unable to access webcam. Check permissions.';
  }
});

// Stop webcam
stopBtn.addEventListener('click', () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
  
  startBtn.disabled = false;
  stopBtn.disabled = true;
  captureBtn.disabled = true;
  detectionStatus.textContent = 'Webcam stopped';
  resultBox.style.display = 'none';
});

// Face detection loop
function startFaceDetection() {
  detectionInterval = setInterval(async () => {
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        detectionStatus.textContent = `✓ Face detected (${(detection.detection.score * 100).toFixed(1)}% confidence)`;

        if (CONFIG.AUTO_MARK && !markInProgress) {
          const now = Date.now();
          if (now - lastAutoMarkAt >= AUTO_MARK_COOLDOWN_MS) {
            await markAttendanceFromDetection(detection, { autoMode: true });
            lastAutoMarkAt = Date.now();
          }
        }
      } else {
        detectionStatus.textContent = '⏳ Waiting for face...';
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, 100);
}

// Capture and mark attendance
captureBtn.addEventListener('click', async () => {
  try {
    const detection = await captureMultiFrameDetection();
    if (!detection) {
      return;
    }

    if (CONFIG.LIVENESS) {
      const passed = await runLivenessChallenge();
      if (!passed) {
        showResult('error', 'Liveness Check Failed', 'Verification challenge not completed in time.');
        detectionStatus.textContent = '✗ Liveness check failed';
        return;
      }
    }


    await markAttendanceFromDetection(detection, { autoMode: false });
  } catch (error) {
    console.error('Error:', error);
    showResult('error', 'Error', error.message);
    captureBtn.disabled = false;
  }
});

async function captureMultiFrameDetection() {
  const ctx = canvas.getContext('2d');
  const framesRequired = CONFIG.MULTI_FRAME ? 3 : 1;
  let lastDetection = null;

  for (let i = 0; i < framesRequired; i += 1) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      showResult('error', 'No Face Detected', 'Please position your face properly in the camera.');
      return null;
    }

    lastDetection = detection;
    if (framesRequired > 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return lastDetection;
}

function eyeAspectRatio(eye) {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const A = dist(eye[1], eye[5]);
  const B = dist(eye[2], eye[4]);
  const C = dist(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
}

async function runLivenessChallenge() {
  const challenges = [
    { type: 'blink', label: 'Please Blink' },
    { type: 'left', label: 'Turn Head Left' },
    { type: 'right', label: 'Turn Head Right' }
  ];
  
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  detectionStatus.innerHTML = `<span style="color: #ff9800; font-weight: bold; font-size: 1.2rem;">Challenge: ${challenge.label}</span>`;
  
  const start = Date.now();
  let success = false;
  let eyeClosedFrames = 0;

  while (Date.now() - start < 4000) {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (detection?.landmarks) {
      if (challenge.type === 'blink') {
        const leftEye = detection.landmarks.getLeftEye();
        const rightEye = detection.landmarks.getRightEye();
        const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
        if (ear < 0.2) eyeClosedFrames += 1;
        else if (eyeClosedFrames >= 2) { success = true; break; }
      } else if (challenge.type === 'left') {
        const nose = detection.landmarks.getNose();
        const jaw = detection.landmarks.getJawOutline();
        // Simple heuristic: nose closer to left side of jaw than right
        const distLeft = Math.abs(nose[0].x - jaw[0].x);
        const distRight = Math.abs(nose[0].x - jaw[16].x);
        if (distLeft < distRight * 0.5) { success = true; break; }
      } else if (challenge.type === 'right') {
        const nose = detection.landmarks.getNose();
        const jaw = detection.landmarks.getJawOutline();
        const distLeft = Math.abs(nose[0].x - jaw[0].x);
        const distRight = Math.abs(nose[0].x - jaw[16].x);
        if (distRight < distLeft * 0.5) { success = true; break; }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return success;
}

// IndexedDB Utility for Offline Storage
const DB_NAME = 'AttendanceDB';
const STORE_NAME = 'pendingAttendance';

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveOfflineAttendance(data) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add({ ...data, timestamp: Date.now() });
}

async function syncOfflineAttendance() {
  if (!navigator.onLine) return;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const records = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  for (const record of records) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (response.ok) {
        db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(record.id);
      }
    } catch (e) {
      console.error('Failed to sync record:', e);
    }
  }
}

window.addEventListener('online', syncOfflineAttendance);

async function markAttendanceFromDetection(detection, { autoMode = false } = {}) {
  if (markInProgress) return;
  markInProgress = true;

  try {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    if (!autoMode) captureBtn.disabled = true;

    detectionStatus.textContent = autoMode
      ? '⏳ Auto-marking attendance...'
      : '⏳ Processing face recognition...';

    // Send face descriptor to backend for recognition
    const response = await fetch(`${CONFIG.API_URL}/students/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faceDescriptor: Array.from(detection.descriptor),
        threshold: CONFIG.THRESHOLD,
      }),
    });

    const data = await response.json();

    if (data.success && data.matched) {
      const payload = {
        studentId: data.student.id,
        status: 'present',
        confidence: Math.round(data.confidence * 100),
        photo: canvas.toDataURL('image/jpeg'),
        deviceInfo: { userAgent: navigator.userAgent, platform: navigator.platform },
        location: await getLocationPayload(),
      };

      try {
        const attendanceResponse = await fetch(`${CONFIG.API_URL}/attendance/mark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const attendanceData = await attendanceResponse.json();

        if (attendanceData.success) {
          showResult('success', '✓ Attendance Marked!', `Welcome, ${data.student.name}`);
        } else {
          showResult('error', 'Attendance Error', attendanceData.error);
        }
      } catch (networkError) {
        console.warn('Network error, saving offline:', networkError);
        await saveOfflineAttendance(payload);
        showResult('success', '☁️ Offline Attendance Saved', `Network unavailable. ${data.student.name}'s attendance will sync later.`);
      }
    } else {
      if (!autoMode) showResult('error', 'Face Not Recognized', 'Please register first or try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    if (!autoMode) showResult('error', 'Error', error.message);
  } finally {
    if (!autoMode) captureBtn.disabled = false;
    markInProgress = false;
  }
}


// Show result message
function showResult(type, title, message) {
  resultBox.className = `result-box ${type}`;
  resultTitle.textContent = title;
  resultMessage.textContent = message;
  studentInfo.style.display = 'none';
  resultBox.style.display = 'block';
}

// Settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const apiUrl = document.getElementById('apiUrl').value;
  const threshold = document.getElementById('threshold').value;
  const autoMarkEnabled = document.getElementById('autoMarkEnabled').value;
  const multiFrameEnabled = document.getElementById('multiFrameEnabled').value;
  const livenessEnabled = document.getElementById('livenessEnabled').value;
  const locationEnabled = document.getElementById('locationEnabled').value;

  localStorage.setItem('apiUrl', apiUrl);
  localStorage.setItem('threshold', threshold);
  localStorage.setItem('autoMarkEnabled', autoMarkEnabled);
  localStorage.setItem('multiFrameEnabled', multiFrameEnabled);
  localStorage.setItem('livenessEnabled', livenessEnabled);
  localStorage.setItem('locationEnabled', locationEnabled);

  CONFIG.API_URL = apiUrl;
  CONFIG.THRESHOLD = parseFloat(threshold);
  CONFIG.AUTO_MARK = autoMarkEnabled === 'true';
  CONFIG.MULTI_FRAME = multiFrameEnabled !== 'false';
  CONFIG.LIVENESS = livenessEnabled === 'true';
  CONFIG.LOCATION = locationEnabled === 'true';

  alert('✓ Settings saved!');
});

// Load initial settings
document.getElementById('apiUrl').value = CONFIG.API_URL;
document.getElementById('threshold').value = CONFIG.THRESHOLD;
document.getElementById('autoMarkEnabled').value = String(CONFIG.AUTO_MARK);
if (multiFrameEnabledEl) multiFrameEnabledEl.value = String(CONFIG.MULTI_FRAME);
if (livenessEnabledEl) livenessEnabledEl.value = String(CONFIG.LIVENESS);
if (locationEnabledEl) locationEnabledEl.value = String(CONFIG.LOCATION);

async function getLocationPayload() {
  if (!CONFIG.LOCATION || !navigator.geolocation) {
    return {};
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 4000 }
    );
  });
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW Registered', reg))
      .catch(err => console.log('SW Registration Failed', err));
  });
}

