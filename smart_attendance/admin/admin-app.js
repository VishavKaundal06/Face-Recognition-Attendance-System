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
const editPhoneEl = document.getElementById('editPhone');
const editBranchEl = document.getElementById('editBranch');
const editYearEl = document.getElementById('editYear');
const editErrorEl = document.getElementById('editError');
const studentCsvFileEl = document.getElementById('studentCsvFile');
const importStudentsBtn = document.getElementById('importStudentsBtn');
const importStatusEl = document.getElementById('importStatus');
const correctionsListEl = document.getElementById('correctionsList');
const correctionFilterEl = document.getElementById('correctionFilter');
const holidayTitleEl = document.getElementById('holidayTitle');
const holidayDateEl = document.getElementById('holidayDate');
const holidayTypeEl = document.getElementById('holidayType');
const holidayDescriptionEl = document.getElementById('holidayDescription');
const addHolidayBtn = document.getElementById('addHolidayBtn');
const holidayStatusEl = document.getElementById('holidayStatus');
const holidaysListEl = document.getElementById('holidaysList');
const auditLogsEl = document.getElementById('auditLogs');
const refreshAuditBtn = document.getElementById('refreshAuditBtn');

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

let charts = {};

function renderAttendanceChart({ present = 0, absent = 0, late = 0, leave = 0 } = {}) {
  const canvas = document.getElementById('attendanceChart');
  if (!canvas) return;

  if (charts.attendance) {
    charts.attendance.destroy();
  }

  charts.attendance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: ['Present', 'Absent', 'Late', 'Leave'],
      datasets: [{
        data: [present, absent, late, leave],
        backgroundColor: ['#4CAF50', '#f44336', '#ff9800', '#2196f3']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderTrendsChart(trends) {
  const canvas = document.getElementById('trendsChart');
  if (!canvas) return;

  if (charts.trends) charts.trends.destroy();

  charts.trends = new Chart(canvas, {
    type: 'line',
    data: {
      labels: trends.map(t => t._id),
      datasets: [{
        label: 'Attendance Count',
        data: trends.map(t => t.count),
        borderColor: '#2196f3',
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderBranchChart(stats) {
  const canvas = document.getElementById('branchChart');
  if (!canvas) return;

  if (charts.branch) charts.branch.destroy();

  charts.branch = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: stats.map(s => `${s._id.branch} (${s._id.course})`),
      datasets: [{
        data: stats.map(s => s.totalStudents),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
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
    } else if (section === 'corrections') {
      loadCorrections();
    } else if (section === 'holidays') {
      loadHolidays();
    } else if (section === 'audit') {
      loadAuditLogs();
    } else if (section === 'dashboard') {
      loadDashboard();
    }
  });
});

async function importStudentsCsv() {
  if (!studentCsvFileEl?.files?.length) {
    if (importStatusEl) importStatusEl.textContent = 'Select a CSV file first.';
    return;
  }

  if (importStatusEl) importStatusEl.textContent = 'Importing...';
  importStudentsBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('file', studentCsvFileEl.files[0]);

    const response = await apiRequest('/students/import', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Import failed');
    }

    const summary = data.data || {};
    if (importStatusEl) {
      importStatusEl.textContent = `Imported: ${summary.created || 0}, Skipped: ${summary.skipped || 0}`;
    }
    await loadStudents();
  } catch (error) {
    if (importStatusEl) importStatusEl.textContent = `Import failed: ${error.message}`;
  } finally {
    importStudentsBtn.disabled = false;
  }
}

importStudentsBtn?.addEventListener('click', importStudentsCsv);

// Load models
async function loadModels() {
  try {
    console.log('Loading face-api models...');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/'),
      faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/'),
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
    const summaryStatsResponse = await apiRequest(`/attendance/stats/summary?startDate=${today}&endDate=${today}`);
    const summaryStatsData = await summaryStatsResponse.json();

    if (summaryStatsData.success) {
      const present = summaryStatsData.data.totalPresent || 0;
      const late = summaryStatsData.data.totalLate || 0;
      const leave = summaryStatsData.data.totalLeave || 0;

      // Since absences are usually implicit in attendance systems, derive it by default.
      const derivedAbsent = Math.max(0, totalStudents - (present + late + leave));
      const recordedAbsent = summaryStatsData.data.totalAbsent || 0;
      const absent = Math.max(derivedAbsent, recordedAbsent);

      document.getElementById('presentToday').textContent = present;
      document.getElementById('absentToday').textContent = absent;
      document.getElementById('lateToday').textContent = late;

      renderAttendanceChart({ present, absent, late, leave });
    }

    // Load Analytics
    const trendsResponse = await apiRequest('/analytics/trends');
    const trendsData = await trendsResponse.json();
    if (trendsData.success) renderTrendsChart(trendsData.data);

    const branchStatsResponse = await apiRequest('/analytics/class-stats');
    const branchStatsData = await branchStatsResponse.json();
    if (branchStatsData.success) renderBranchChart(branchStatsData.data);

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
    tbody.innerHTML = '<tr><td colspan="8">No students found</td></tr>';
    return;
  }

  tbody.innerHTML = students
    .map(
      (student) => `
        <tr>
          <td>${student.name}</td>
          <td>${student.rollNumber}</td>
          <td>${student.email}</td>
          <td>${student.phone || '-'}</td>
          <td>${student.branch || student.department || '-'}</td>
          <td>${student.year || student.semester || '-'}</td>
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
  if (editPhoneEl) editPhoneEl.value = student.phone || '';
  if (document.getElementById('editCourse')) document.getElementById('editCourse').value = student.course || '';
  if (editBranchEl) editBranchEl.value = student.branch || student.department || '';
  if (editYearEl) editYearEl.value = student.year || student.semester || '';
  if (editErrorEl) editErrorEl.textContent = '';

  openEditModal();
}

async function saveEditedStudent() {
  const id = editStudentIdEl.value;
  const payload = {
    name: editNameEl.value.trim(),
    email: editEmailEl.value.trim(),
    phone: editPhoneEl?.value.trim(),
    course: document.getElementById('editCourse')?.value.trim(),
    branch: editBranchEl?.value.trim(),
    year: editYearEl?.value ? parseInt(editYearEl.value, 10) : undefined,
  };

  if (payload.branch) {
    payload.department = payload.branch;
  }
  if (payload.year) {
    payload.semester = payload.year;
  }

  if (!payload.name || !payload.email || !payload.phone || !payload.course || !payload.branch || !payload.year) {
    editErrorEl.textContent = 'All fields are required.';
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
    editErrorEl.textContent = 'Please enter a valid email.';
    return;
  }

  if (payload.year < 1 || payload.year > 8) {
    editErrorEl.textContent = 'Year must be between 1 and 8.';
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
    const tbody = document.getElementById('attendanceList');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">Failed to load status: Database unavailable. Attendance status is temporarily unavailable. Example Roll No: 72547364737</td>
        </tr>
      `;
    }
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

// ========== CORRECTIONS ==========
async function loadCorrections() {
  if (!correctionsListEl) return;
  const status = correctionFilterEl?.value || 'pending';
  correctionsListEl.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

  try {
    const response = await apiRequest(`/attendance/corrections?status=${status}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load corrections');
    }

    const rows = (data.data || []).map((req) => {
      const attendance = req.attendanceId || {};
      const studentName = attendance.studentName || '-';
      const rollNumber = attendance.rollNumber || '-';
      const date = attendance.date ? new Date(attendance.date).toLocaleDateString() : '-';
      const actions = req.status === 'pending'
        ? `
          <button class="btn-edit" onclick="reviewCorrection('${req._id}', 'approved')">Approve</button>
          <button class="btn-delete" onclick="reviewCorrection('${req._id}', 'rejected')">Reject</button>
        `
        : '-';

      return `
        <tr>
          <td>${studentName}</td>
          <td>${rollNumber}</td>
          <td>${date}</td>
          <td>${req.requestedStatus}</td>
          <td>${req.reason || '-'}</td>
          <td>${req.status}</td>
          <td>${actions}</td>
        </tr>
      `;
    });

    correctionsListEl.innerHTML = rows.length
      ? rows.join('')
      : '<tr><td colspan="7">No correction requests</td></tr>';
  } catch (error) {
    correctionsListEl.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
  }
}

async function reviewCorrection(id, status) {
  const reviewNote = prompt('Add a review note (optional):') || '';
  try {
    const response = await apiRequest(`/attendance/corrections/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, reviewNote }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update request');
    }
    await loadCorrections();
  } catch (error) {
    alert(error.message);
  }
}

correctionFilterEl?.addEventListener('change', loadCorrections);

// ========== HOLIDAYS ==========
async function loadHolidays() {
  if (!holidaysListEl) return;
  holidaysListEl.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

  try {
    const response = await apiRequest('/calendar/holidays');
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load holidays');
    }

    const rows = (data.data || []).map((holiday) => {
      return `
        <tr>
          <td>${new Date(holiday.date).toLocaleDateString()}</td>
          <td>${holiday.title}</td>
          <td>${holiday.type}</td>
          <td>${holiday.description || '-'}</td>
          <td>
            <button class="btn-delete" onclick="deleteHoliday('${holiday._id}')">Delete</button>
          </td>
        </tr>
      `;
    });

    holidaysListEl.innerHTML = rows.length
      ? rows.join('')
      : '<tr><td colspan="5">No holidays added</td></tr>';
  } catch (error) {
    holidaysListEl.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
  }
}

async function addHoliday() {
  const title = holidayTitleEl?.value.trim();
  const date = holidayDateEl?.value;
  const type = holidayTypeEl?.value || 'holiday';
  const description = holidayDescriptionEl?.value.trim();

  if (!title || !date) {
    if (holidayStatusEl) holidayStatusEl.textContent = 'Title and date are required.';
    return;
  }

  addHolidayBtn.disabled = true;
  if (holidayStatusEl) holidayStatusEl.textContent = 'Saving...';

  try {
    const response = await apiRequest('/calendar/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, type, description }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add holiday');
    }

    if (holidayStatusEl) holidayStatusEl.textContent = 'Holiday added.';
    holidayTitleEl.value = '';
    holidayDateEl.value = '';
    holidayDescriptionEl.value = '';
    await loadHolidays();
  } catch (error) {
    if (holidayStatusEl) holidayStatusEl.textContent = error.message;
  } finally {
    addHolidayBtn.disabled = false;
  }
}

async function deleteHoliday(id) {
  if (!confirm('Delete this holiday?')) return;
  try {
    const response = await apiRequest(`/calendar/holidays/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete holiday');
    }
    await loadHolidays();
  } catch (error) {
    alert(error.message);
  }
}

addHolidayBtn?.addEventListener('click', addHoliday);

// ========== AUDIT LOGS ==========
async function loadAuditLogs() {
  if (!auditLogsEl) return;
  auditLogsEl.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

  try {
    const response = await apiRequest('/audit/logs?limit=100');
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load audit logs');
    }

    const rows = (data.data || []).map((log) => {
      const time = new Date(log.createdAt).toLocaleString();
      const entity = log.entityType ? `${log.entityType}:${log.entityId || '-'}` : '-';
      const meta = log.metadata ? JSON.stringify(log.metadata) : '-';
      return `
        <tr>
          <td>${time}</td>
          <td>${log.actorRole || '-'}</td>
          <td>${log.action}</td>
          <td>${entity}</td>
          <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${meta}</td>
        </tr>
      `;
    });

    auditLogsEl.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="5">No audit logs</td></tr>';
  } catch (error) {
    auditLogsEl.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
  }
}

refreshAuditBtn?.addEventListener('click', loadAuditLogs);

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
const courseConfig = {
    'B.Tech': { sems: 8, branches: ['CSE'] },
    'M.Tech': { sems: 4, branches: ['CSE'] },
    'MCA': { sems: 4, branches: ['None'] },
    'MBA': { sems: 4, branches: ['THM', 'None'] },
    'IHM': { sems: 8, branches: ['None'] },
    'M.Sc': { sems: 4, branches: ['Env', 'None'] }
};

document.getElementById('regCourse')?.addEventListener('change', (e) => {
    const config = courseConfig[e.target.value] || { sems: 8, branches: [] };
    const semCount = config.sems;
    const yearSelect = document.getElementById('regYear');
    if (yearSelect) {
        yearSelect.innerHTML = '<option value="" selected disabled>Select Semester</option>';
        for (let i = 1; i <= semCount; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Semester ${i}`;
            yearSelect.appendChild(opt);
        }
    }

    const branchSelect = document.getElementById('regBranch');
    if (branchSelect) {
        branchSelect.innerHTML = '<option value="" selected disabled>Select Branch</option>';
        config.branches.forEach(branch => {
            const opt = document.createElement('option');
            opt.value = branch;
            opt.textContent = branch;
            branchSelect.appendChild(opt);
        });
    }
});

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
      .withFaceDescriptor();

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
  const phone = document.getElementById('regPhone').value;
  const course = document.getElementById('regCourse').value;
  const branch = document.getElementById('regBranch').value;
  const year = document.getElementById('regYear').value;

  if (!name || !roll || !email || !phone || !course || !branch || !year || !currentRegisterDescriptor) {
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
        phone,
        course,
        branch,
        year: parseInt(year, 10),
        department: branch,
        semester: parseInt(year, 10),
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
      document.getElementById('regPhone').value = '';
      document.getElementById('regCourse').value = '';
      document.getElementById('regBranch').value = '';
      document.getElementById('regYear').value = '';
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
document.getElementById('reportTodayBtn')?.addEventListener('click', () => setQuickReportRange('today'));
document.getElementById('reportWeekBtn')?.addEventListener('click', () => setQuickReportRange('week'));
document.getElementById('reportMonthBtn')?.addEventListener('click', () => setQuickReportRange('month'));

document.getElementById('refreshHealthBtn')?.addEventListener('click', () => {
  healthRetryDelayMs = 5000;
  clearHealthRetryTimer();
  loadSystemHealth();
});

function setQuickReportRange(range) {
  const startEl = document.getElementById('reportStart');
  const endEl = document.getElementById('reportEnd');
  if (!startEl || !endEl) return;

  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (range === 'today') {
    // no change
  } else if (range === 'week') {
    const day = start.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    start.setDate(start.getDate() - diff);
  } else if (range === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  startEl.value = start.toISOString().split('T')[0];
  endEl.value = end.toISOString().split('T')[0];
  generateAttendanceReport();
}

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

// Export Handlers
document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {
  window.open(`${CONFIG.API_URL}/analytics/export/pdf?token=${CONFIG.TOKEN}`, '_blank');
});

document.getElementById('exportBtn')?.addEventListener('click', async () => {
    // Override default CSV export with the new analytics one if preferred, or add specific class
    window.open(`${CONFIG.API_URL}/analytics/export/csv?token=${CONFIG.TOKEN}`, '_blank');
});
