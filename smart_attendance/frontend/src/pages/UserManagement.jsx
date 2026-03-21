import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit3, Search, Camera, X, UserCheck } from 'lucide-react';
import { getUsers, registerUser, deleteUser, updateUser } from '../api/client';
import { showToast } from '../components/Toast';

// ─── WebcamCapture ─────────────────────────────────────────────
function WebcamCapture({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [captured, setCaptured] = useState(null);
    const [stream, setStream] = useState(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                setStream(s);
                if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
            })
            .catch(() => showToast('Camera access denied', 'error'));
        return () => stream?.getTracks().forEach(t => t.stop());
        // eslint-disable-next-line
    }, []);

    const capture = () => {
        const v = videoRef.current, c = canvasRef.current;
        if (!v || !c) return;
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        c.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            setCaptured({ blob, url });
        }, 'image/jpeg', 0.9);
    };

    const confirm = () => {
        if (captured) {
            const file = new File([captured.blob], 'face.jpg', { type: 'image/jpeg' });
            onCapture(file);
            stream?.getTracks().forEach(t => t.stop());
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 440 }}>
                <div className="modal-header">
                    <h3>Capture Face Photo</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <video ref={videoRef} className="webcam-preview" muted playsInline />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {captured && (
                    <img src={captured.url} alt="captured" className="webcam-preview" style={{ marginTop: 12 }} />
                )}
                <div className="flex gap-2 mt-4">
                    {!captured ? (
                        <button className="btn btn-primary" onClick={capture}><Camera size={16} /> Capture</button>
                    ) : (
                        <>
                            <button className="btn btn-success" onClick={confirm}><UserCheck size={16} /> Use Photo</button>
                            <button className="btn btn-ghost" onClick={() => setCaptured(null)}>Retake</button>
                        </>
                    )}
                    <button className="btn btn-ghost ml-auto" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ─── Register Modal ────────────────────────────────────────────
function RegisterModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({ name: '', employee_id: '', email: '', department: '' });
    const [photo, setPhoto] = useState(null);
    const [showWebcam, setShowWebcam] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!photo) { showToast('Please provide a face photo', 'error'); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
            fd.append('face_image', photo);
            await registerUser(fd);
            showToast(`User "${form.name}" registered successfully!`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Registration failed';
            showToast(msg, 'error');
        } finally { setLoading(false); }
    };

    return (
        <>
            {showWebcam && (
                <WebcamCapture
                    onCapture={f => { setPhoto(f); setShowWebcam(false); }}
                    onClose={() => setShowWebcam(false)}
                />
            )}
            <div className="modal-overlay">
                <div className="modal">
                    <div className="modal-header">
                        <h3>Register New User</h3>
                        <button className="modal-close" onClick={onClose}><X size={18} /></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" value={form.name} required
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Employee / Student ID *</label>
                                <input className="form-input" value={form.employee_id} required
                                    onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email}
                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department / Class</label>
                                <input className="form-input" value={form.department}
                                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
                            </div>
                        </div>

                        {/* Face Photo */}
                        <div className="form-group">
                            <label className="form-label">Face Photo *</label>
                            <div className="flex gap-2 mb-2">
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWebcam(true)}>
                                    <Camera size={14} /> Use Webcam
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current.click()}>
                                    Upload Photo
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => setPhoto(e.target.files[0])} />
                            </div>
                            {photo && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="badge badge-green">✓ Photo ready: {photo.name || 'webcam_capture.jpg'}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button className="btn btn-primary" type="submit" disabled={loading}>
                                {loading ? 'Registering...' : '+ Register User'}
                            </button>
                            <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

// ─── Edit Modal ────────────────────────────────────────────────
function EditModal({ user, onClose, onSuccess }) {
    const [form, setForm] = useState({ name: user.name, email: user.email || '', department: user.department || '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUser(user.id, form);
            showToast('User updated successfully!', 'success');
            onSuccess();
            onClose();
        } catch { showToast('Update failed', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>Edit User</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Department / Class</label>
                        <input className="form-input" value={form.department}
                            onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button className="btn btn-primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────
export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [showRegister, setShowRegister] = useState(false);
    const [editUser, setEditUser] = useState(null);

    const fetchUsers = useCallback(async () => {
        try { setUsers(await getUsers()); }
        catch { showToast('Failed to load users', 'error'); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleDelete = async (user) => {
        if (!window.confirm(`Delete "${user.name}"? This will also delete all their attendance records.`)) return;
        try {
            await deleteUser(user.id);
            showToast(`"${user.name}" deleted`, 'success');
            fetchUsers();
        } catch { showToast('Delete failed', 'error'); }
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.employee_id.toLowerCase().includes(search.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {showRegister && (
                <RegisterModal onClose={() => setShowRegister(false)} onSuccess={fetchUsers} />
            )}
            {editUser && (
                <EditModal user={editUser} onClose={() => setEditUser(null)} onSuccess={fetchUsers} />
            )}

            <div className="page-header">
                <h1>User Management</h1>
                <p>Register and manage personnel with face recognition</p>
            </div>

            <div className="page-toolbar">
                <div className="search-bar">
                    <Search size={14} />
                    <input
                        className="form-input"
                        placeholder="Search by name, ID, department..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary ml-auto" onClick={() => setShowRegister(true)}>
                    <Plus size={16} /> Add User
                </button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Employee ID</th>
                                <th>Department</th>
                                <th>Email</th>
                                <th>Face</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="empty-state">
                                            <p>No users found. Click "Add User" to register someone.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-blue">{u.employee_id}</span></td>
                                        <td>{u.department || '—'}</td>
                                        <td>{u.email || '—'}</td>
                                        <td>
                                            <span className={`badge ${u.has_face_encoding ? 'badge-green' : 'badge-red'}`}>
                                                {u.has_face_encoding ? '✓ Enrolled' : '✗ Missing'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditUser(u)} title="Edit">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(u)} title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
