import { useState, useEffect, useCallback } from 'react';
import { Download, BarChart2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { getAttendance, getUsers, downloadReport } from '../api/client';
import { showToast } from '../components/Toast';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13,
        }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
            ))}
        </div>
    );
}

export default function Reports() {
    const [attendance, setAttendance] = useState([]);
    const [users, setUsers] = useState([]);
    const [period, setPeriod] = useState('7d');
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const start = new Date(now);
            if (period === '7d') start.setDate(now.getDate() - 7);
            if (period === '30d') start.setDate(now.getDate() - 30);
            if (period === '90d') start.setDate(now.getDate() - 90);
            const fmt = d => d.toISOString().split('T')[0];
            const [a, u] = await Promise.all([
                getAttendance({ start_date: fmt(start), end_date: fmt(now) }),
                getUsers(),
            ]);
            setAttendance(a); setUsers(u);
        } catch { showToast('Failed to load report data', 'error'); }
        finally { setLoading(false); }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Derived data ───────────────────────────────────────────
    // Daily count chart
    const dailyCounts = {};
    attendance.forEach(r => {
        dailyCounts[r.date] = (dailyCounts[r.date] || 0) + 1;
    });
    const dailyData = Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

    // Department breakdown
    const deptCounts = {};
    attendance.forEach(r => {
        const d = r.user_department || 'Unknown';
        deptCounts[d] = (deptCounts[d] || 0) + 1;
    });
    const deptData = Object.entries(deptCounts).map(([name, value]) => ({ name, value }));

    // Top attendees
    const userCounts = {};
    attendance.forEach(r => {
        userCounts[r.user_name] = (userCounts[r.user_name] || 0) + 1;
    });
    const topAttendees = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name: name?.split(' ')[0] || 'Unknown', count }));

    const totalDays = dailyData.length || 1;
    const avgPerDay = (attendance.length / totalDays).toFixed(1);

    return (
        <div>
            <div className="page-header">
                <h1>Reports & Analytics</h1>
                <p>Visualize attendance trends and generate reports</p>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid mb-4">
                {[
                    { label: 'Total Records', value: attendance.length },
                    { label: 'Unique Users', value: Object.keys(userCounts).length },
                    { label: 'Avg Per Day', value: avgPerDay },
                    { label: 'Active Days', value: dailyData.length },
                ].map(s => (
                    <div className="card" key={s.label} style={{ padding: '16px 20px' }}>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="page-toolbar mb-4">
                <div className="flex gap-2">
                    {[['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['90d', 'Last 90 Days']].map(([v, l]) => (
                        <button key={v}
                            className={`btn ${period === v ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                            onClick={() => setPeriod(v)}>{l}</button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto">
                    <button className="btn btn-ghost btn-sm" onClick={() => { downloadReport('csv'); showToast('Downloading CSV...', 'info'); }}>
                        <Download size={14} /> CSV
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { downloadReport('excel'); showToast('Downloading Excel...', 'info'); }}>
                        <Download size={14} /> Excel
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { downloadReport('pdf'); showToast('Downloading PDF...', 'info'); }}>
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="empty-state"><p>Loading report data...</p></div>
            ) : (
                <>
                    {/* Daily Attendance Line Chart */}
                    <div className="card mb-4">
                        <div className="card-title"><BarChart2 size={16} /> Daily Attendance Trend</div>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="count" name="Present" stroke="var(--blue)"
                                    strokeWidth={2} dot={{ fill: 'var(--blue)', r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* Top Attendees */}
                        <div className="card">
                            <div className="card-title">Top Attendees</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={topAttendees} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={80} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Days" fill="var(--blue)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Department Pie Chart */}
                        <div className="card">
                            <div className="card-title">By Department</div>
                            {deptData.length === 0 ? (
                                <div className="empty-state"><p>No data</p></div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={deptData} cx="50%" cy="50%" outerRadius={90}
                                            dataKey="value" nameKey="name" label={({ name, percent }) =>
                                                `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
