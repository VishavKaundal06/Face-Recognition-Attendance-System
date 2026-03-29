const API_URL = localStorage.getItem('apiUrl') || 'http://localhost:5050/api';
const TOKEN = localStorage.getItem('token');

if (!TOKEN) {
    window.location.href = 'index.html'; // Redirect to login/main
}

const studentInfoDisplay = document.getElementById('studentInfoDisplay');
const overallPercentage = document.getElementById('overallPercentage');
const historyContent = document.getElementById('historyContent');
const timetableContent = document.getElementById('timetableContent');
const recentClasses = document.getElementById('recentClasses');

// Fetch student profile and data on load
document.addEventListener('DOMContentLoaded', async () => {
    await loadStudentDashboard();
    setupTabNavigation();
});

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }
    return response.json();
}

async function loadStudentDashboard() {
    try {
        // 1. Get Me (Auth)
        const authData = await apiRequest('/auth/me');
        if (!authData.success) return;
        const user = authData.user;
        studentInfoDisplay.textContent = `Welcome, ${user.username}`;

        // 2. Load Attendance History
        // We need an endpoint for current student's attendance
        const attendanceData = await apiRequest('/students/my-attendance');
        if (attendanceData.success) {
            renderHistory(attendanceData.data);
            calculateOverall(attendanceData.data);
            renderRecent(attendanceData.data);
        }

        // 3. Load Timetable
        const timetableData = await apiRequest('/calendar/my-timetable');
        if (timetableData.success) {
            renderTimetable(timetableData.data);
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderHistory(records) {
    if (!records.length) {
        historyContent.innerHTML = '<p>No attendance records found.</p>';
        return;
    }
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${records.map(r => `
                    <tr>
                        <td>${new Date(r.date).toLocaleDateString()}</td>
                        <td>${r.subject || 'General'}</td>
                        <td>${new Date(r.timeIn).toLocaleTimeString()}</td>
                        <td><span class="status-badge ${r.status}">${r.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    historyContent.innerHTML = html;
}

function calculateOverall(records) {
    if (!records.length) return;
    const present = records.filter(r => r.status === 'present').length;
    const percentage = ((present / records.length) * 100).toFixed(1);
    overallPercentage.textContent = `${percentage}%`;
    
    if (parseFloat(percentage) < 75) {
        overallPercentage.style.color = '#f44336'; // Red if below 75%
    }
}

function renderRecent(records) {
    const recent = records.slice(0, 5);
    recentClasses.innerHTML = recent.map(r => `
        <div class="timetable-card" style="margin-bottom: 10px;">
            <h4>${r.subject || 'General'}</h4>
            <p>${new Date(r.date).toLocaleDateString()} - ${r.status}</p>
        </div>
    `).join('');
}

function renderTimetable(slots) {
    if (!slots.length) {
        timetableContent.innerHTML = '<p>No timetable scheduled for your branch.</p>';
        return;
    }
    timetableContent.innerHTML = slots.map(s => `
        <div class="timetable-card">
            <h4>${s.subject}</h4>
            <p><strong>${s.dayOfWeek}</strong></p>
            <p>${s.startTime} - ${s.endTime}</p>
            <p>Teacher: ${s.teacher}</p>
            <p>Room: ${s.room || 'N/A'}</p>
        </div>
    `).join('');
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// Apply Leave
document.getElementById('submitLeave')?.addEventListener('click', async () => {
    const reason = document.getElementById('leaveReason').value;
    const start = document.getElementById('leaveStart').value;
    const end = document.getElementById('leaveEnd').value;

    if (!reason || !start || !end) {
        alert('Please fill all fields');
        return;
    }

    try {
        const res = await apiRequest('/attendance/corrections', {
            method: 'POST',
            body: JSON.stringify({
                reason,
                startDate: start,
                endDate: end,
                requestedStatus: 'leave'
            })
        });
        if (res.success) {
            alert('Leave request submitted successfully');
            document.getElementById('leaveReason').value = '';
        }
    } catch (error) {
        alert('Failed to submit request');
    }
});
