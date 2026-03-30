import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8080',
    timeout: 15000
});

// ─── Users ────────────────────────────────────────────────────
export const getUsers = () => API.get('/api/users/').then(r => r.data);

export const registerUser = (formData) =>
    API.post('/api/users/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);

export const updateUser = (id, data) =>
    API.put(`/api/users/${id}`, data).then(r => r.data);

export const deleteUser = (id) =>
    API.delete(`/api/users/${id}`);

export const updateFace = (id, formData) =>
    API.post(`/api/users/${id}/update-face`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);

// ─── Attendance ───────────────────────────────────────────────
export const recognizeFace = (imageB64) =>
    API.post('/api/attendance/recognize', { image_b64: imageB64 }).then(r => r.data);

export const getAttendance = (params = {}) =>
    API.get('/api/attendance/', { params }).then(r => r.data);

export const getTodayAttendance = () =>
    API.get('/api/attendance/today').then(r => r.data);

export const getStats = () =>
    API.get('/api/attendance/stats').then(r => r.data);

export const deleteAttendance = (id) =>
    API.delete(`/api/attendance/${id}`);

// ─── Reports ──────────────────────────────────────────────────
export const downloadReport = (format, params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.user_id) query.append('user_id', params.user_id);
    const url = `http://localhost:8080/api/reports/${format}?${query.toString()}`;
    window.open(url, '_blank');
};

// ─── Health ───────────────────────────────────────────────────
export const healthCheck = () => API.get('/health').then(r => r.data);

export default API;
