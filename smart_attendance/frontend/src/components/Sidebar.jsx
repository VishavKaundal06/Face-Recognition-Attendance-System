import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    BarChart3,
    Eye,
    Scan,
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/users', label: 'User Management', icon: Users },
    { to: '/attendance', label: 'Attendance', icon: ClipboardList },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/unknown', label: 'Unknown Faces', icon: Eye },
];

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <Scan size={20} color="white" />
                </div>
                <h2>FaceAttend AI</h2>
                <p>Recognition System v1.0</p>
            </div>

            <nav className="sidebar-nav">
                <span className="nav-section-label">Navigation</span>
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <Icon className="nav-icon" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <p>
                    <span className="status-dot" />
                    System Online
                </p>
                <p style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    Backend: localhost:8000
                </p>
            </div>
        </aside>
    );
}
