const API_URL = localStorage.getItem('apiUrl') || 'http://localhost:5050/api';

const courseConfig = {
    'B.Tech': { sems: 8, branches: ['CSE'] },
    'M.Tech': { sems: 4, branches: ['CSE'] },
    'MCA': { sems: 4, branches: ['None'] },
    'MBA': { sems: 4, branches: ['THM', 'None'] },
    'IHM': { sems: 8, branches: ['None'] },
    'M.Sc': { sems: 4, branches: ['Env', 'None'] }
};

const registerVideo = document.getElementById('registerVideo');
const registerCanvas = document.getElementById('registerCanvas');
const regStartBtn = document.getElementById('regStartBtn');
const regCaptureBtn = document.getElementById('regCaptureBtn');
const regStopBtn = document.getElementById('regStopBtn');
const regStatus = document.getElementById('regStatus');
const submitRegBtn = document.getElementById('submitRegBtn');

let currentStream = null;
let currentFaceDescriptor = null;

async function loadModels() {
    regStatus.textContent = 'Loading AI models...';
    regStartBtn.disabled = true;
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/'),
            faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/'),
            faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/')
        ]);
        regStatus.textContent = 'Models loaded. Ready.';
        regStartBtn.disabled = false;
    } catch (error) {
        regStatus.textContent = 'Failed to load models. Check connection.';
        console.error(error);
    }
}

regStartBtn.addEventListener('click', async () => {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        registerVideo.srcObject = currentStream;
        
        regStartBtn.disabled = true;
        regCaptureBtn.disabled = false;
        regStopBtn.disabled = false;
        regStatus.textContent = 'Camera started. Position your face clearly.';
    } catch (error) {
        regStatus.textContent = 'Error: Cannot access camera';
        console.error(error);
    }
});

regStopBtn.addEventListener('click', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    registerVideo.srcObject = null;
    regStartBtn.disabled = false;
    regCaptureBtn.disabled = true;
    regStopBtn.disabled = true;
    regStatus.textContent = 'Camera stopped';
});

regCaptureBtn.addEventListener('click', async () => {
    regStatus.textContent = 'Detecting face... Please hold still.';
    regCaptureBtn.disabled = true;

    try {
        const ctx = registerCanvas.getContext('2d');
        registerCanvas.width = registerVideo.videoWidth;
        registerCanvas.height = registerVideo.videoHeight;
        ctx.drawImage(registerVideo, 0, 0);

        const detection = await faceapi.detectSingleFace(registerCanvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            currentFaceDescriptor = Array.from(detection.descriptor);
            regStatus.textContent = `✓ Face captured successfully! (Confidence: ${(detection.detection.score * 100).toFixed(1)}%)`;
            regCaptureBtn.textContent = '✓ Face Captured';
            regCaptureBtn.classList.replace('btn-success', 'btn-primary');
        } else {
            regStatus.textContent = '✗ No face detected. Make sure your face is clearly visible and try again.';
        }
    } catch (error) {
        regStatus.textContent = '✗ Error processing image.';
        console.error(error);
    } finally {
        regCaptureBtn.disabled = false;
    }
});

submitRegBtn.addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const roll = document.getElementById('regRoll').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const course = document.getElementById('regCourse').value;
    const branch = document.getElementById('regBranch').value;
    const year = document.getElementById('regYear').value;

    if (!name || !roll || !email || !phone || !course || !branch || !year) {
        alert('Please fill out all personal and academic details.');
        return;
    }
    
    if (!currentFaceDescriptor) {
        alert('Please capture your face before submitting.');
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    submitRegBtn.disabled = true;
    submitRegBtn.textContent = 'Submitting...';

    try {
        const payload = {
            name,
            rollNumber: roll,
            email,
            phone,
            course,
            branch,
            department: branch,
            year: parseInt(year, 10),
            semester: parseInt(year, 10),
            faceDescriptor: currentFaceDescriptor
        };

        const response = await fetch(`${API_URL}/students/self-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('✓ Registration successful! You can now mark your attendance.');
            window.location.href = 'index.html';
        } else {
            alert(`✗ Registration failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        alert(`✗ Connection error: ${error.message}`);
    } finally {
        submitRegBtn.disabled = false;
        submitRegBtn.textContent = 'Submit Registration';
    }
});

document.getElementById('regCourse').addEventListener('change', (e) => {
    const config = courseConfig[e.target.value] || { sems: 8, branches: [] };
    const semCount = config.sems;
    const yearSelect = document.getElementById('regYear');
    yearSelect.innerHTML = '<option value="" selected disabled>Select Semester</option>';
    for (let i = 1; i <= semCount; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Semester ${i}`;
        yearSelect.appendChild(opt);
    }
    
    const branchSelect = document.getElementById('regBranch');
    branchSelect.innerHTML = '<option value="" selected disabled>Select Branch</option>';
    config.branches.forEach(branch => {
        const opt = document.createElement('option');
        opt.value = branch;
        opt.textContent = branch;
        branchSelect.appendChild(opt);
    });
});

window.addEventListener('DOMContentLoaded', loadModels);
