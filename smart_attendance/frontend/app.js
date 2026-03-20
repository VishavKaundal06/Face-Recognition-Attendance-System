// Configuration
const CONFIG = {
  API_URL: localStorage.getItem('apiUrl') || 'http://localhost:5050/api',
  THRESHOLD: parseFloat(localStorage.getItem('threshold')) || 0.6,
  MODEL_URL: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/',
  AUTO_MARK: localStorage.getItem('autoMarkEnabled') === 'true',
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
        .withFaceDescriptors();

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
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Detect face and get descriptor
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detection) {
      showResult('error', 'No Face Detected', 'Please position your face properly in the camera.');
      return;
    }

    await markAttendanceFromDetection(detection, { autoMode: false });
  } catch (error) {
    console.error('Error:', error);
    showResult('error', 'Error', error.message);
    captureBtn.disabled = false;
  }
});

async function markAttendanceFromDetection(detection, { autoMode = false } = {}) {
  if (markInProgress) return;
  markInProgress = true;

  try {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    if (!autoMode) {
      captureBtn.disabled = true;
    }

    detectionStatus.textContent = autoMode
      ? '⏳ Auto-marking attendance...'
      : '⏳ Processing face recognition...';

    // Send face descriptor to backend for recognition
    const response = await fetch(`${CONFIG.API_URL}/students/recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        faceDescriptor: Array.from(detection.descriptor),
        threshold: CONFIG.THRESHOLD,
      }),
    });

    const data = await response.json();

    if (response.status === 503) {
      showResult('error', 'Service Unavailable', 'Database is unavailable. Please try again later.');
      detectionStatus.textContent = '✗ Backend running without database';
      return;
    }

    if (data.success && data.matched) {
      // Mark attendance
      const attendanceResponse = await fetch(`${CONFIG.API_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: data.student.id,
          status: 'present',
          confidence: Math.round(data.confidence * 100),
          photo: canvas.toDataURL('image/jpeg'),
        }),
      });

      const attendanceData = await attendanceResponse.json();

      if (attendanceResponse.status === 503) {
        showResult('error', 'Service Unavailable', 'Database is unavailable. Cannot mark attendance right now.');
        detectionStatus.textContent = '✗ Backend running without database';
      } else if (attendanceData.success) {
        showResult(
          'success',
          '✓ Attendance Marked!',
          autoMode ? `Auto-marked: ${data.student.name}` : `Welcome, ${data.student.name}`
        );
        
        // Show student info
        document.getElementById('studentName').textContent = data.student.name;
        document.getElementById('studentRoll').textContent = data.student.rollNumber;
        document.getElementById('confidence').textContent = Math.round(data.confidence * 100);
        studentInfo.style.display = 'block';

        detectionStatus.textContent = '✓ Attendance marked successfully!';
      } else {
        if (!autoMode || attendanceData.error !== 'Attendance already marked for today') {
          showResult('error', 'Attendance Error', attendanceData.error || 'Failed to mark attendance');
        }
        detectionStatus.textContent = '✗ Error: ' + (attendanceData.error || 'Unknown error');
      }
    } else {
      if (!autoMode) {
        showResult('error', 'Face Not Recognized', 'Please register first or try again.');
      }
      detectionStatus.textContent = '✗ Face not recognized. Distance: ' + data.bestDistance?.toFixed(3);
    }
  } catch (error) {
    console.error('Error:', error);
    if (!autoMode) {
      showResult('error', 'Error', error.message);
    }
  } finally {
    if (!autoMode) {
      captureBtn.disabled = false;
    }
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

  localStorage.setItem('apiUrl', apiUrl);
  localStorage.setItem('threshold', threshold);
  localStorage.setItem('autoMarkEnabled', autoMarkEnabled);

  CONFIG.API_URL = apiUrl;
  CONFIG.THRESHOLD = parseFloat(threshold);
  CONFIG.AUTO_MARK = autoMarkEnabled === 'true';

  alert('✓ Settings saved!');
});

// Load initial settings
document.getElementById('apiUrl').value = CONFIG.API_URL;
document.getElementById('threshold').value = CONFIG.THRESHOLD;
document.getElementById('autoMarkEnabled').value = String(CONFIG.AUTO_MARK);

// Initialize
loadModels();
