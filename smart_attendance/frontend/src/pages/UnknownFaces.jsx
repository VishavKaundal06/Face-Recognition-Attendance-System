import { Eye, Info } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff } from 'lucide-react';

// This page captures unknown faces from the camera stream for admin review
export default function UnknownFaces() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    const [isActive, setIsActive] = useState(false);
    const [captures, setCaptures] = useState([]);
    const [error, setError] = useState(null);

    const captureUnknown = useCallback(async () => {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        try {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            const res = await fetch('http://localhost:8080/api/attendance/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_b64: b64 }),
            }).then(r => r.json());

            if (!res.recognized && res.message?.includes('not recognized')) {
                // Only store if there was a face but not recognized
                const imgUrl = canvas.toDataURL('image/jpeg', 0.7);
                setCaptures(prev => {
                    if (prev.length >= 20) return prev; // max 20
                    return [{ id: Date.now(), url: imgUrl, time: new Date().toLocaleTimeString() }, ...prev];
                });
            }
        } catch (e) { /* silent */ }
    }, []);

    const startCamera = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
            setIsActive(true);
            intervalRef.current = setInterval(captureUnknown, 3000);
        } catch { setError('Camera access denied'); }
    };

    const stopCamera = () => {
        videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
        clearInterval(intervalRef.current);
        setIsActive(false);
    };

    useEffect(() => () => stopCamera(), []);

    return (
        <div>
            <div className="page-header">
                <h1>Unknown Faces</h1>
                <p>Monitor and review unrecognized faces detected by the camera</p>
            </div>

            <div className="card mb-4" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: 14 }}>
                    <Info size={16} /> How this works
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                    When the camera detects a face that doesn't match any registered user, it's captured here for admin review.
                    You can then register those individuals via User Management.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Camera */}
                <div className="card">
                    <div className="card-title"><Eye size={16} /> Detection Camera</div>
                    <div className="camera-container" style={{ minHeight: 240 }}>
                        <video ref={videoRef} className="camera-video" muted playsInline />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        {isActive && (
                            <div className="camera-overlay-text">
                                <span className="recording-dot" /> Monitoring
                            </div>
                        )}
                        {!isActive && (
                            <div className="camera-placeholder">
                                <Eye size={40} strokeWidth={1.2} />
                                <p>Start monitoring for unknown faces</p>
                            </div>
                        )}
                        {error && <div className="camera-placeholder" style={{ color: 'var(--red)' }}>{error}</div>}
                    </div>
                    <div className="flex gap-2 mt-4">
                        {!isActive
                            ? <button className="btn btn-primary" onClick={startCamera}><Camera size={16} /> Start Monitoring</button>
                            : <button className="btn btn-danger" onClick={stopCamera}><CameraOff size={16} /> Stop</button>}
                        {captures.length > 0 && (
                            <button className="btn btn-ghost" onClick={() => setCaptures([])}>Clear All</button>
                        )}
                    </div>
                </div>

                {/* Captures grid */}
                <div className="card">
                    <div className="card-title">
                        <Eye size={16} /> Captured Unknown Faces
                        <span className="badge badge-yellow ml-auto">{captures.length}</span>
                    </div>
                    {captures.length === 0 ? (
                        <div className="empty-state">
                            <Eye size={32} />
                            <p>No unknown faces captured yet</p>
                            <p style={{ fontSize: 12 }}>Start the camera to begin monitoring</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                            {captures.map(c => (
                                <div key={c.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <img src={c.url} alt="unknown" style={{ width: '100%', display: 'block' }} />
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        background: 'rgba(0,0,0,0.7)', padding: '4px 8px',
                                        fontSize: 11, color: '#fff',
                                    }}>
                                        {c.time}
                                    </div>
                                    <button
                                        onClick={() => setCaptures(p => p.filter(x => x.id !== c.id))}
                                        style={{
                                            position: 'absolute', top: 4, right: 4,
                                            background: 'rgba(239,68,68,0.8)', border: 'none',
                                            borderRadius: 4, color: '#fff', padding: '2px 6px', fontSize: 11, cursor: 'pointer',
                                        }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
