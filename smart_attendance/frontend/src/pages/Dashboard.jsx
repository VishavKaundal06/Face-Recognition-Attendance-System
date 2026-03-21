import { useState, useEffect, useCallback } from 'react';
import {
    Users, UserCheck, UserX, TrendingUp,
    ClipboardList, Clock,
} from 'lucide-react';
import CameraFeed from '../components/CameraFeed';
import { getStats, getTodayAttendance } from '../api/client';
import { showToast } from '../components/Toast';

function StatCard({ label, value, icon: Icon, colorClass, suffix = '' }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${colorClass}`}>
                <Icon size={22} />
            </div>
            <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}{suffix}</div>
            </div>
        </div>
    );
}

function AttendanceListItem({ record, isNew }) {
    const time = new Date(`1970-01-01T${record.time}`).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit',
    });
    return (
        <div
            className={`flex items-center gap-3 ${isNew ? 'attendance-flash' : ''}`}
            style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
            }}
        >
            <div className="user-avatar" style={{ width: 36, height: 36, minWidth: 36 }}>
                {record.user_name?.charAt(0) || '?'}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {record.user_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {record.user_employee_id} · {record.user_department || 'N/A'}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                    {record.status}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> {time}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState({ total_users: 0, present_today: 0, absent_today: 0, attendance_rate: 0 });
    const [todayAttendance, setTodayAttendance] = useState([]);
    const [newIds, setNewIds] = useState(new Set());

    const fetchData = useCallback(async () => {
        try {
            const [s, a] = await Promise.all([getStats(), getTodayAttendance()]);
            setStats(s);
            setTodayAttendance(a);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, 10000);
        return () => clearInterval(timer);
    }, [fetchData]);

    const handleRecognized = useCallback((result) => {
        showToast(`✅ Attendance marked for ${result.name}!`, 'success');
        fetchData();
        setNewIds(prev => new Set([...prev, result.user_id]));
        setTimeout(() => {
            setNewIds(prev => { const s = new Set(prev); s.delete(result.user_id); return s; });
        }, 3000);
    }, [fetchData]);

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Live face recognition and real-time attendance tracking</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <StatCard label="Total Registered" value={stats.total_users} icon={Users} colorClass="blue" />
                <StatCard label="Present Today" value={stats.present_today} icon={UserCheck} colorClass="green" />
                <StatCard label="Absent Today" value={stats.absent_today} icon={UserX} colorClass="red" />
                <StatCard label="Attendance Rate" value={stats.attendance_rate} icon={TrendingUp} colorClass="purple" suffix="%" />
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
                {/* Camera */}
                <div className="card">
                    <div className="card-title">
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: 'var(--red)', display: 'inline-block',
                            animation: 'blink 1.2s infinite',
                        }} />
                        Live Camera Feed
                    </div>
                    <CameraFeed onRecognized={handleRecognized} />
                </div>

                {/* Today's Attendance */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div className="card-title">
                        <ClipboardList size={16} />
                        Today's Attendance
                        <span className="badge badge-blue ml-auto">{todayAttendance.length}</span>
                    </div>
                    <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                        {todayAttendance.length === 0 ? (
                            <div className="empty-state">
                                <Users size={32} />
                                <p>No attendance recorded yet today</p>
                            </div>
                        ) : (
                            todayAttendance.map(r => (
                                <AttendanceListItem
                                    key={r.id}
                                    record={r}
                                    isNew={newIds.has(r.user_id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
