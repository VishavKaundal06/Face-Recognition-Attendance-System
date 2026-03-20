// Admin Configuration
const CONFIG = {
  API_URL: localStorage.getItem('adminApiUrl') || 'http://localhost:5050/api',
  TOKEN: localStorage.getItem('adminToken'),
};

if (!CONFIG.TOKEN) {
  window.location.href = '/login.html';
}

// Current state
let currentRegisterStream = null;
let currentRegisterDescriptor = null;
let faceLandmarksShown = false;
let healthRetryDelayMs = 5000;
let healthRetryTimer = null;
let allStudents = [];
let lastGeneratedReport = null;

// DOM Elements
const sidebarLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('pageTitle');
const offlineBanner = document.getElementById('offlineBanner');
const userDisplay = document.getElementById('userDisplay');
const editModal = document.getElementById('editStudentModal');
const editStudentIdEl = document.getElementById('editStudentId');
const editNameEl = document.getElementById('editName');
const editEmailEl = document.getElementById('editEmail');
const editDepartmentEl = document.getElementById('editDepartment');
const editSemesterEl = document.getElementById('editSemester');
const editErrorEl = document.getElementById('editError');

function showOfflineBanner(message = 'Backend is unreachable. Retrying connection...') {
  if (!offlineBanner) return;
  offlineBanner.textContent = message;
  offlineBanner.style.display = 'block';
}

function hideOfflineBanner() {
  if (!offlineBanner) return;
  offlineBanner.style.display = 'none';
}

function clearHealthRetryTimer() {
  if (healthRetryTimer) {
    clearTimeout(healthRetryTimer);
    healthRetryTimer = null;
  }
}

function scheduleHealthRetry() {
  clearHealthRetryTimer();
  healthRetryTimer = setTimeout(() => {
    loadSystemHealth();
  }, healthRetryDelayMs);
  healthRetryDelayMs = Math.min(healthRetryDelayMs * 2, 60000);
}

function renderAttendanceChart({ present = 0, absent = 0, late = 0, leave = 0 } = {}) {
  const canvas = document.getElementById('attendanceChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = 380;
  const height = 220;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  const data = [
    { label: 'Present', value: present, color: '#4CAF50' },
    { label: 'Absent', value: absent, color: '#f44336' },
    { label: 'Late', value: late, color: '#ff9800' },
    { label: 'Leave', value: leave, color: '#2196f3' },
  ];

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const chartLeft = 40;
  const chartBottom = 180;
  const chartHeight = 130;
  const barWidth = 55;
  const barGap = 25;

  ctx.strokeStyle = '#d9d9d9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartLeft, 20);
  ctx.lineTo(chartLeft, chartBottom);
  ctx.lineTo(width - 20, chartBottom);
  ctx.stroke();

  data.forEach((item, index) => {
    const x = chartLeft + 20 + index * (barWidth + barGap);
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = chartBottom - barHeight;

    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(item.value), x + barWidth / 2, y - 6);
    ctx.fillText(item.label, x + barWidth / 2, chartBottom + 16);
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${CONFIG.API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CONFIG.TOKEN}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('adminToken');
    window.location.href = '/login.html';
    throw new Error('Session expired. Please login again.');
  }

  if (response.status === 503) {
    let data = null;
    try {
      data = await response.clone().json();
    } catch (_) {
      // ignore parse errors
    }
    throw new Error(
      data?.message ||
        'Database unavailable. Start MongoDB or configure a remote MONGO_URI.'
    );
  }

  return response;
}

async function loadCurrentUser() {
  try {
    const cached = localStorage.getItem('adminUser');
    if (cached && userDisplay) {
      const parsed = JSON.parse(cached);
      userDisplay.textContent = parsed.username || 'Admin';
    }

    const response = await apiRequest('/auth/me');
    const data = await response.json();
    if (response.ok && data.success && data.user) {
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      if (userDisplay) userDisplay.textContent = data.user.username || 'Admin';
    }
  } catch (_) {
    if (userDisplay && !userDisplay.textContent.trim()) {
      userDisplay.textContent = 'Admin';
    }
  }
}

// Section navigation
sidebarLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.getAttribute('data-section');

    sidebarLinks.forEach((l) => l.classList.remove('active'));
    contentSections.forEach((s) => s.classList.remove('active'));

    link.classList.add('active');
    document.getElementById(section).classList.add('active');

    // Update page title
    pageTitle.textContent = link.textContent.trim().split(' ').pop();

    // Load data for specific sections
    if (section === 'students') {
      loadStudents();
    } else if (section === 'attendance') {
      loadAttendance();
    } else if (section === 'dashboard') {
      loadDashboard();
    }
  });
});

// Load models
async function loadModels() {
  try {
    console.log('Loading face-api models...');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/'),
      faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/'),
    ]);
    console.log('✓ Models loaded');
  } catch (error) {
    console.error('Error loading models:', error);
  }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    await loadSystemHealth();

    const studentsResponse = await apiRequest('/students');
    const studentsData = await studentsResponse.json();

    let totalStudents = 0;
    if (studentsData.success && Array.isArray(studentsData.data)) {
      totalStudents = studentsData.data.length;
      document.getElementById('totalStudents').textContent = totalStudents;
    }

    // Get stats
    const today = new Date().toISOString().split('T')[0];
    const statsResponse = await apiRequest(`/attendance/stats/summary?startDate=${today}&endDate=${today}`);
    const statsData = await statsResponse.json();

    if (statsData.success) {
      const present = statsData.data.totalPresent || 0;
      const late = statsData.data.totalLate || 0;
      const leave = statsData.data.totalLeave || 0;

      // Since absences are usually implicit in attendance systems, derive it by default.
      const derivedAbsent = Math.max(0, totalStudents - (present + late + leave));
      const recordedAbsent = statsData.data.totalAbsent || 0;
      const absent = Math.max(derivedAbsent, recordedAbsent);

      document.getElementById('presentToday').textContent = present;
      document.getElementById('absentToday').textContent = absent;
      document.getElementById('lateToday').textContent = late;

      renderAttendanceChart({ present, absent, late, leave });
    }

    // Get recent attendance
    const todayResponse = await apiRequest(`/attendance/date/${new Date().toISOString().split('T')[0]}`);
    const todayData = await todayResponse.json();

    if (todayData.success) {
      const tbody = document.getElementById('recentAttendance');
      tbody.innerHTML = todayData.data
        .slice(0, 10)
        .map(
          (record) => `
        <tr>
          <td>${record.studentName}</td>
          <td>${record.rollNumber}</td>
          <td>${new Date(record.timeIn).toLocaleTimeString()}</td>
          <td><span class="status-badge ${record.status}">${record.status}</span></td>
        </tr>
      `
        )
        .join('');
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadSystemHealth() {
  const backendStatusEl = document.getElementById('backendStatus');
  const mongoStatusEl = document.getElementById('mongoStatus');
  const lastCheckedEl = document.getElementById('healthLastChecked');

  if (!backendStatusEl || !mongoStatusEl || !lastCheckedEl) return;

  backendStatusEl.textContent = 'Checking...';
  backendStatusEl.className = 'health-value unknown';
  mongoStatusEl.textContent = 'Checking...';
  mongoStatusEl.className = 'health-value unknown';

  try {
    const response = await apiRequest('/health/detailed');
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Health check failed');
    }

    const backendState = data.checks?.backend || 'unknown';
    const mongoState = data.checks?.mongodb || 'unknown';

    backendStatusEl.textContent = backendState;
    backendStatusEl.className = `health-value ${backendState}`;

    mongoStatusEl.textContent = mongoState;
    mongoStatusEl.className = `health-value ${mongoState}`;

    lastCheckedEl.textContent = new Date().toLocaleString();

    if (backendState === 'ok') {
      if (mongoState !== 'connected') {
        showOfflineBanner('Backend is running in degraded mode (MongoDB unavailable).');
      } else {
        hideOfflineBanner();
      }
      healthRetryDelayMs = 5000;
      clearHealthRetryTimer();
    } else {
      showOfflineBanner('Backend is unstable. Retrying connection...');
      scheduleHealthRetry();
    }
  } catch (error) {
    backendStatusEl.textContent = 'unreachable';
    backendStatusEl.className = 'health-value disconnected';
    mongoStatusEl.textContent = 'unknown';
    mongoStatusEl.className = 'health-value unknown';
    lastCheckedEl.textContent = `${new Date().toLocaleString()} (error)`;
    showOfflineBanner('Backend is unreachable. Retrying connection...');
    scheduleHealthRetry();
  }
}

// ========== STUDENTS ==========
async function loadStudents() {
  try {
    const response = await apiRequest('/students');
    const data = await response.json();

    if (data.success) {
      allStudents = data.data;
      renderStudents(allStudents);
    }
  } catch (error) {
    console.error('Error loading students:', error);
  }
}

function renderStudents(students) {
  const tbody = document.getElementById('studentsList');
  if (!tbody) return;

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="7">No students found</td></tr>';
    return;
  }

  tbody.innerHTML = students
    .map(
      (student) => `
        <tr>
          <td>${student.name}</td>
          <td>${student.rollNumber}</td>
          <td>${student.email}</td>
          <td>${student.department}</td>
          <td>${student.semester}</td>
          <td>${student.hasFace ? '✓' : '✗'}</td>
          <td>
            <button class="btn-edit" onclick="editStudent('${student._id}')">Edit</button>
            <button class="btn-delete" onclick="deleteStudent('${student._id}')">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function openEditModal() {
  if (!editModal) return;
  editModal.style.display = 'flex';
}

function closeEditModal() {
  if (!editModal) return;
  editModal.style.display = 'none';
  if (editErrorEl) editErrorEl.textContent = '';
}

function editStudent(id) {
  const student = allStudents.find((s) => s._id === id);
  if (!student) {
    alert('Student not found');
    return;
  }

  editStudentIdEl.value = student._id;
  editNameEl.value = student.name || '';
  editEmailEl.value = student.email || '';
  editDepartmentEl.value = student.department || '';
  editSemesterEl.value = student.semester || '';
  if (editErrorEl) editErrorEl.textContent = '';

  openEditModal();
}

async function saveEditedStudent() {
  const id = editStudentIdEl.value;
  const payload = {
    name: editNameEl.value.trim(),
    email: editEmailEl.value.trim(),
    department: editDepartmentEl.value.trim(),
    semester: parseInt(editSemesterEl.value, 10),
  };

  if (!payload.name || !payload.email || !payload.department || !payload.semester) {
    editErrorEl.textContent = 'All fields are required.';
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
    editErrorEl.textContent = 'Please enter a valid email.';
    return;
  }

  if (payload.semester < 1 || payload.semester > 12) {
    editErrorEl.textContent = 'Semester must be between 1 and 12.';
    return;
  }

  try {
    const response = await apiRequest(`/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      editErrorEl.textContent = data.error || 'Failed to update student.';
      return;
    }

    closeEditModal();
    await loadStudents();
    alert('Student updated successfully');
  } catch (error) {
    editErrorEl.textContent = error.message || 'Failed to update student.';
  }
}

function deleteStudent(id) {
  if (confirm('Are you sure you want to delete this student?')) {
    apiRequest(`/students/${id}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert('Student deleted successfully');
          loadStudents();
        }
      })
      .catch((error) => console.error('Error:', error));
  }
}

// ========== REPORTS ==========
async function generateAttendanceReport() {
  const startDate = document.getElementById('reportStart')?.value;
  const endDate = document.getElementById('reportEnd')?.value;
  const reportContent = document.getElementById('reportContent');

  if (!reportContent) return;

  if (!startDate || !endDate) {
    reportContent.innerHTML = '<p>Please select both start and end date.</p>';
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    reportContent.innerHTML = '<p>Start date must be before or equal to end date.</p>';
    return;
  }

  reportContent.innerHTML = '<p>Generating report...</p>';

  try {
    const reportRes = await apiRequest(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
    const reportData = await reportRes.json();

    if (!reportData.success) {
      throw new Error(reportData.error || 'Unable to generate report');
    }

    lastGeneratedReport = reportData.data || null;
    const totals = lastGeneratedReport?.totals || {};
    const topAbsentees = (reportData.data?.byStudent || [])
      .sort((a, b) => (b.absent || 0) - (a.absent || 0))
      .slice(0, 5);

    const absenteesHtml = topAbsentees.length
      ? `<ul>${topAbsentees
          .map(
            (s) => `<li>${s.studentName || 'Unknown'} (${s.rollNumber || '-'}) - Absent: ${s.absent || 0}</li>`
          )
          .join('')}</ul>`
      : '<p>No absentee data in selected range.</p>';

    reportContent.innerHTML = `
      <div class="report-summary-grid">
        <div><strong>Date Range:</strong><br>${startDate} to ${endDate}</div>
        <div><strong>Total Records:</strong><br>${totals.records || 0}</div>
        <div><strong>Total Present:</strong><br>${totals.present || 0}</div>
        <div><strong>Total Absent:</strong><br>${totals.absent || 0}</div>
        <div><strong>Total Late:</strong><br>${totals.late || 0}</div>
        <div><strong>Present %:</strong><br>${totals.presentPercentage || '0.00'}%</div>
        <div><strong>Students Marked:</strong><br>${totals.uniqueStudents || 0}</div>
      </div>
      <div class="report-extra">
        <h4>Top Absentees</h4>
        ${absenteesHtml}
      </div>
    `;
  } catch (error) {
    lastGeneratedReport = null;
    reportContent.innerHTML = `<p>Failed to generate report: ${error.message}</p>`;
  }
}

function exportGeneratedReportCsv() {
  if (!lastGeneratedReport) {
    alert('Generate a report first.');
    return;
  }

  const rows = [];
  rows.push(['Section', 'Key', 'Value']);

  const totals = lastGeneratedReport.totals || {};
  Object.entries(totals).forEach(([key, value]) => {
    rows.push(['totals', key, String(value)]);
  });

  rows.push([]);
  rows.push(['byStudent', 'studentName', 'rollNumber', 'present', 'absent', 'late', 'leave', 'total']);
  (lastGeneratedReport.byStudent || []).forEach((s) => {
    rows.push(['byStudent', s.studentName || '', s.rollNumber || '', s.present || 0, s.absent || 0, s.late || 0, s.leave || 0, s.total || 0]);
  });

  rows.push([]);
  rows.push(['byDay', 'date', 'present', 'absent', 'late', 'leave', 'total']);
  (lastGeneratedReport.byDay || []).forEach((d) => {
    rows.push(['byDay', d.date || '', d.present || 0, d.absent || 0, d.late || 0, d.leave || 0, d.total || 0]);
  });

  const csvText = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========== ATTENDANCE ==========
async function loadAttendance() {
  try {
    const date = document.getElementById('filterDate').value;
    const status = document.getElementById('filterStatus').value;

    let path = `/attendance?limit=100`;
    if (date) path += `&date=${date}`;

    const response = await apiRequest(path);
    const data = await response.json();

    if (data.success) {
      const tbody = document.getElementById('attendanceList');
      tbody.innerHTML = data.data
        .filter((record) => !status || record.status === status)
        .map(
          (record) => `
        <tr>
          <td>${record.studentName}</td>
          <td>${record.rollNumber}</td>
          <td>${new Date(record.date).toLocaleDateString()}</td>
          <td>${new Date(record.timeIn).toLocaleTimeString()}</td>
          <td>${record.status}</td>
          <td>${record.confidence || 'N/A'}</td>
        </tr>
      `
        )
        .join('');
    }
  } catch (error) {
    console.error('Error loading attendance:', error);
  }
}

document.getElementById('filterDate')?.addEventListener('change', loadAttendance);
document.getElementById('filterStatus')?.addEventListener('change', loadAttendance);
document.getElementById('searchStudent')?.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  if (!query) {
    renderStudents(allStudents);
    return;
  }

  const filtered = allStudents.filter((student) => {
    return (
      student.name?.toLowerCase().includes(query) ||
      student.rollNumber?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  });

  renderStudents(filtered);
});

// ========== EXPORT ==========
document.getElementById('exportBtn')?.addEventListener('click', () => {
  const table = document.getElementById('attendanceList').parentElement.querySelector('.table');
  let csv = [];

  // Headers
  const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent);
  csv.push(headers.join(','));

  // Rows
  Array.from(table.querySelectorAll('tbody tr')).forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td')).map((td) => `"${td.textContent}"`);
    csv.push(cells.join(','));
  });

  // Download
  const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
});

// ========== STUDENT REGISTRATION ==========
const registerVideo = document.getElementById('registerVideo');
const registerCanvas = document.getElementById('registerCanvas');
const regStartBtn = document.getElementById('regStartBtn');
const regCaptureBtn = document.getElementById('regCaptureBtn');
const regStopBtn = document.getElementById('regStopBtn');
const regStatus = document.getElementById('regStatus');

regStartBtn?.addEventListener('click', async () => {
  try {
    currentRegisterStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });

    registerVideo.srcObject = currentRegisterStream;

    regStartBtn.disabled = true;
    regCaptureBtn.disabled = false;
    regStopBtn.disabled = false;
    regStatus.textContent = '✓ Camera started - Face will be detected automatically';
  } catch (error) {
    regStatus.textContent = '✗ Error: Unable to access camera';
  }
});

regStopBtn?.addEventListener('click', () => {
  if (currentRegisterStream) {
    currentRegisterStream.getTracks().forEach((track) => track.stop());
  }

  regStartBtn.disabled = false;
  regCaptureBtn.disabled = true;
  regStopBtn.disabled = true;
  regStatus.textContent = 'Camera stopped';
});

regCaptureBtn?.addEventListener('click', async () => {
  try {
    const ctx = registerCanvas.getContext('2d');
    registerCanvas.width = registerVideo.videoWidth;
    registerCanvas.height = registerVideo.videoHeight;
    ctx.drawImage(registerVideo, 0, 0);

    const detection = await faceapi
      .detectSingleFace(registerCanvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detection) {
      currentRegisterDescriptor = Array.from(detection.descriptor);
      regStatus.textContent = `✓ Face captured successfully (${(detection.detection.score * 100).toFixed(1)}%)`;
      regCaptureBtn.textContent = '✓ Face Captured';
    } else {
      regStatus.textContent = '✗ No face detected. Try again.';
    }
  } catch (error) {
    regStatus.textContent = '✗ Error capturing face';
  }
});

document.getElementById('submitRegBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('regName').value;
  const roll = document.getElementById('regRoll').value;
  const email = document.getElementById('regEmail').value;
  const dept = document.getElementById('regDept').value;
  const sem = document.getElementById('regSem').value;

  if (!name || !roll || !email || !dept || !sem || !currentRegisterDescriptor) {
    alert('Please fill all fields and capture face');
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    alert('Please enter a valid email address');
    return;
  }

  try {
    const response = await apiRequest('/students/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        rollNumber: roll,
        email,
        department: dept,
        semester: parseInt(sem),
        faceDescriptor: currentRegisterDescriptor,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert('✓ Student registered successfully!');
      // Reset form
      document.getElementById('regName').value = '';
      document.getElementById('regRoll').value = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regDept').value = '';
      document.getElementById('regSem').value = '';
      currentRegisterDescriptor = null;
      regStatus.textContent = 'Ready to register';
      regCaptureBtn.textContent = 'Capture Face';
    } else {
      alert('✗ Error: ' + data.error);
    }
  } catch (error) {
    alert('✗ Error registering student: ' + error.message);
  }
});

// ========== SETTINGS ==========
document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
  const apiUrl = document.getElementById('settingsApiUrl').value;
  const threshold = document.getElementById('settingsThreshold').value;

  localStorage.setItem('adminApiUrl', apiUrl);
  localStorage.setItem('adminThreshold', threshold);

  CONFIG.API_URL = apiUrl;

  alert('✓ Settings saved!');
});

document.getElementById('generateReport')?.addEventListener('click', generateAttendanceReport);
document.getElementById('exportReportBtn')?.addEventListener('click', exportGeneratedReportCsv);

document.getElementById('refreshHealthBtn')?.addEventListener('click', () => {
  healthRetryDelayMs = 5000;
  clearHealthRetryTimer();
  loadSystemHealth();
});

document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditModal);
document.getElementById('cancelEditBtn')?.addEventListener('click', closeEditModal);
document.getElementById('saveEditBtn')?.addEventListener('click', saveEditedStudent);

editModal?.addEventListener('click', (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

// Load initial settings
document.getElementById('settingsApiUrl').value = CONFIG.API_URL;

const today = new Date().toISOString().split('T')[0];
const reportStartEl = document.getElementById('reportStart');
const reportEndEl = document.getElementById('reportEnd');
if (reportStartEl && !reportStartEl.value) reportStartEl.value = today;
if (reportEndEl && !reportEndEl.value) reportEndEl.value = today;

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/login.html';
});

// Initialize
loadModels();
loadCurrentUser();
loadDashboard();
setInterval(loadSystemHealth, 30000);
