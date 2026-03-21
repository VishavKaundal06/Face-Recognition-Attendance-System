import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { recognizeFace } from '../api/client';

const INTERVAL_MS = 1500; // Scan every 1.5 seconds

export default function CameraFeed({ onRecognized }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    const [isActive, setIsActive] = useState(false);
    const [faceInfo, setFaceInfo] = useState(null);
    const [error, setError] = useState(null);

    const captureAndRecognize = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        try {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            const result = await recognizeFace(b64);

            if (result.recognized) {
                setFaceInfo(result);
                if (result.attendance_marked && onRecognized) {
                    onRecognized(result);
                }
            } else {
                setFaceInfo(null);
            }
        } catch (err) {
            console.warn('Recognition error:', err);
        }
    }, [onRecognized]);

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setIsActive(true);
            intervalRef.current = setInterval(captureAndRecognize, INTERVAL_MS);
        } catch (err) {
            setError('Camera access denied. Please allow camera permissions.');
        }
    }, [captureAndRecognize]);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        clearInterval(intervalRef.current);
        setIsActive(false);
        setFaceInfo(null);
    }, []);

    useEffect(() => () => stopCamera(), [stopCamera]);

    return (
        <div>
            <div className="camera-container" style={{ minHeight: 260 }}>
                <video ref={videoRef} className="camera-video" muted playsInline />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {isActive && (
                    <div className="camera-overlay-text">
                        <span className="recording-dot" />
                        Live Recognition
                    </div>
                )}

                {faceInfo && faceInfo.recognized && (
                    <div style={{
                        position: 'absolute', bottom: 12, left: 12, right: 12,
                        background: 'rgba(34,197,94,0.9)', borderRadius: 10,
                        padding: '10px 14px', backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
                            ✓ {faceInfo.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                            {faceInfo.employee_id} · {faceInfo.department} ·{' '}
                            {faceInfo.already_marked ? 'Already Marked' : 'Attendance Marked ✓'}
                            {' · '}Confidence: {faceInfo.confidence}%
                        </div>
                    </div>
                )}

                {!isActive && !error && (
                    <div className="camera-placeholder">
                        <Camera size={48} strokeWidth={1.2} />
                        <p>Camera is off</p>
                        <p style={{ fontSize: 12 }}>Click "Start Camera" to begin recognition</p>
                    </div>
                )}

                {error && (
                    <div className="camera-placeholder">
                        <CameraOff size={48} strokeWidth={1.2} color="var(--red)" />
                        <p style={{ color: 'var(--red)' }}>{error}</p>
                    </div>
                )}
            </div>

            <div className="flex gap-2 mt-4">
                {!isActive ? (
                    <button className="btn btn-primary" onClick={startCamera}>
                        <Camera size={16} /> Start Camera
                    </button>
                ) : (
                    <button className="btn btn-danger" onClick={stopCamera}>
                        <CameraOff size={16} /> Stop Camera
                    </button>
                )}
                {isActive && (
                    <button className="btn btn-ghost" onClick={() => { stopCamera(); setTimeout(startCamera, 300); }}>
                        <RefreshCw size={16} /> Restart
                    </button>
                )}
            </div>
        </div>
    );
}
