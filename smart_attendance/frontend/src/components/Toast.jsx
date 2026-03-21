import { useEffect, useState } from 'react';

let toastQueue = [];
let setToastFn = null;

export function showToast(message, type = 'info') {
    if (setToastFn) {
        setToastFn({ message, type, id: Date.now() });
        setTimeout(() => setToastFn(null), 3500);
    }
}

export default function Toast() {
    const [toast, setToast] = useState(null);
    useEffect(() => { setToastFn = setToast; }, []);
    if (!toast) return null;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    return (
        <div className={`toast ${toast.type}`}>
            <span>{icons[toast.type]}</span>
            <span>{toast.message}</span>
        </div>
    );
}
