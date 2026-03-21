import { useState, useEffect, useCallback } from 'react';
import { Download, Search, Calendar, Trash2, Filter } from 'lucide-react';
import { getAttendance, deleteAttendance, getUsers } from '../api/client';
import { downloadReport } from '../api/client';
import { showToast } from '../components/Toast';

export default function Attendance() {
    const [records, setRecords] = useState([]);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({ start_date: '', end_date: '', user_id: '' });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.start_date) params.start_date = filters.start_date;
            if (filters.end_date) params.end_date = filters.end_date;
            if (filters.user_id) params.user_id = filters.user_id;
            setRecords(await getAttendance(params));
        } catch { showToast('Failed to load attendance records', 'error'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);
    useEffect(() => { getUsers().then(setUsers).catch(() => { }); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this attendance record?')) return;
        try {
            await deleteAttendance(id);
            showToast('Record deleted', 'success');
            fetchRecords();
        } catch { showToast('Delete failed', 'error'); }
    };

    const handleExport = (format) => {
        const params = {};
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;
        if (filters.user_id) params.user_id = filters.user_id;
        downloadReport(format, params);
        showToast(`Downloading ${format.toUpperCase()} report...`, 'info');
    };

    const filtered = records.filter(r =>
        r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.user_employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        r.user_department?.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (t) => {
        try { return new Date(`1970-01-01T${t}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
        catch { return t; }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Attendance Records</h1>
                <p>View, filter and export attendance data</p>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div className="card-title"><Filter size={16} /> Filters</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Start Date</label>
                        <input type="date" className="form-input"
                            value={filters.start_date}
                            onChange={e => setFilters(p => ({ ...p, start_date: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End Date</label>
                        <input type="date" className="form-input"
                            value={filters.end_date}
                            onChange={e => setFilters(p => ({ ...p, end_date: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">User</label>
                        <select className="form-select"
                            value={filters.user_id}
                            onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))}>
                            <option value="">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id})</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => setFilters({ start_date: '', end_date: '', user_id: '' })}>
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="page-toolbar">
                <div className="search-bar">
                    <Search size={14} />
                    <input className="form-input" placeholder="Search by name, ID, department..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} records</span>
                <div className="flex gap-2 ml-auto">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleExport('csv')}>
                        <Download size={14} /> CSV
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleExport('excel')}>
                        <Download size={14} /> Excel
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleExport('pdf')}>
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Employee ID</th>
                                <th>Department</th>
                                <th>Date</th>
                                <th>Check-In Time</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8}><div className="empty-state"><p>No attendance records found</p></div></td></tr>
                            ) : (
                                filtered.map((r, i) => (
                                    <tr key={r.id}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="user-avatar" style={{ width: 30, height: 30, minWidth: 30, fontSize: 12 }}>
                                                    {r.user_name?.charAt(0) || '?'}
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.user_name || '—'}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-blue">{r.user_employee_id || '—'}</span></td>
                                        <td>{r.user_department || '—'}</td>
                                        <td>
                                            <div className="flex items-center gap-1" style={{ fontSize: 13 }}>
                                                <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                                                {r.date}
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{formatTime(r.time)}</td>
                                        <td><span className="badge badge-green">{r.status}</span></td>
                                        <td>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(r.id)}>
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
