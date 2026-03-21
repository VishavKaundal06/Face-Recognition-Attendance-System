import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import UnknownFaces from './pages/UnknownFaces';

export default function App() {
    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/unknown" element={<UnknownFaces />} />
                    </Routes>
                </main>
            </div>
            <Toast />
        </BrowserRouter>
    );
}
