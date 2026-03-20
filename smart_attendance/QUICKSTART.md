# Smart Attendance System - Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### 0) One-command project setup

```bash
npm run setup
```

This prepares env files, installs backend dependencies, and runs readiness checks.

For the standalone Python attendance app:

```bash
npm run py:setup
npm run py:start
```

### 0.1) Start/stop full stack

```bash
npm run up
```

```bash
npm run down
```

### Step 1: Install MongoDB

**macOS (using Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Or try the helper:

```bash
./start_mongodb.sh
```

or:

```bash
npm run mongo:start
```

If `MONGO_URI` is remote, or `ALLOW_START_WITHOUT_DB=true`, this command may no-op by design.

If MongoDB still fails to start:

```bash
npm run mongo:doctor
```

If `brew` is installed but command is not found, add Homebrew to PATH in your shell profile and restart terminal.

Note: Homebrew installation requires a macOS Administrator account (sudo access).

Helpers:

```bash
npm run mac:bootstrap
npm run mac:install-brew
npm run mac:fix-brew-path
npm run mac:install-mongo
```

**Or use MongoDB Atlas (Cloud):**
- Go to [atlas.mongodb.com](https://atlas.mongodb.com)
- Create free cluster
- Copy connection string

Set remote URI quickly:

```bash
./use_remote_mongo.sh "mongodb+srv://USER:PASS@cluster.mongodb.net/smart_attendance"
# or
npm run mongo:use-remote -- "mongodb+srv://USER:PASS@cluster.mongodb.net/smart_attendance"
```

### Step 2: Install Node.js Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Environment

```bash
cd backend
cp .env.example .env

# Edit .env file
# Linux/macOS: nano .env
# Windows: notepad .env
```

Add:
```
PORT=5050
MONGO_URI=mongodb://localhost:27017/smart_attendance
JWT_SECRET=your_random_secret_key_12345
NODE_ENV=development
CORS_ORIGIN=http://localhost:8000,http://localhost:8001
```

### Step 4: Start Backend

```bash
cd backend
npm start
```

✅ Backend is running on http://localhost:5050

If using MongoDB Atlas/remote URI, update `backend/.env` first and then run:

```bash
npm run up
```

(`npm run up` now skips local Mongo startup when `MONGO_URI` is remote.)

### Step 5: Open Frontend

```bash
# Terminal 2
cd frontend
python3 -m http.server 8000
```

✅ Frontend is running on http://localhost:8000

### Step 6: Open Admin Panel

```bash
# Terminal 3
cd admin
python3 -m http.server 8001
```

✅ Admin is running on http://localhost:8001

### Create admin user (recommended)

```bash
./create_admin.sh admin admin@test.com password123 admin
```

Validation rules:
- username: 3-32 chars (`a-z`, `A-Z`, `0-9`, `_`, `.`, `-`)
- email: valid email format
- password: minimum 8 chars
- role: `admin` | `teacher` | `staff`

Help:

```bash
npm --prefix backend run create-admin -- --help
```

Then login from http://localhost:8001/login.html

### One-command startup (recommended)

```bash
./start_all.sh
```

Or from project root:

```bash
npm start
```

Force restart managed services in one command:

```bash
npm run start:restart
```

Stop everything:

```bash
./stop_all.sh
```

Note: `stop_all.sh` also attempts port-based cleanup on `5050`, `8000`, and `8001` if PID files are missing.

Or:

```bash
npm run stop
```

### Run environment checks

```bash
npm run doctor
```

### Run full readiness checks (doctor + status + smoke)

```bash
npm run ready
```

### Check runtime status

```bash
npm run status
```

To stop project-managed MongoDB:

```bash
npm run mongo:stop
```

### Tail live logs

```bash
npm run logs
```

### Run backend smoke test

```bash
npm run smoke
```

### Clean stale runtime state

```bash
npm run reset
```

---

## 📋 First Time Setup Checklist

- [ ] MongoDB installed and running
- [ ] Backend dependencies installed (`npm install` in `/backend`)
- [ ] `.env` file created with correct values
- [ ] Backend started (`npm start`)
- [ ] Frontend accessible (http://localhost:8000)
- [ ] Admin panel accessible (http://localhost:8001)

---

## 🧪 Quick Test

### 1. Create Admin Account

```bash
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@test.com",
    "password": "password123",
    "role": "admin"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

Copy the token from response.

### 3. Register a Student (via API)

```bash
curl -X POST http://localhost:5050/api/students/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "John Doe",
    "rollNumber": "2021001",
    "email": "john@example.com",
    "department": "CSE",
    "semester": 4
  }'
```

---

## 🎯 Workflow

### As Admin:
1. Open http://localhost:8001
2. If first-time setup, use "Create first admin user" on login page
3. Go to "Register Student"
4. Fill student details
5. Capture face via webcam
6. Submit

### As Student:
1. Open http://localhost:8000
2. Click "Start Webcam"
3. Click "Capture & Mark"
4. Get attendance confirmation

Tip: You can enable Auto Mark in the Settings tab to mark attendance automatically when a face is detected.

---

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect to MongoDB" | Start MongoDB: `brew services start mongodb-community` |
| "connect ECONNREFUSED 127.0.0.1:27017" | MongoDB is not running. Start it and retry `./create_admin.sh` |
| "CORS error" | Ensure CORS_ORIGIN in .env matches your frontend URL |
| "Webcam not working" | Use HTTPS or localhost, check browser permissions |
| "Models not loading" | Check internet, models load from CDN |
| "Port already in use" | Change PORT in .env or kill process on that port |
| "Port 5050/8000/8001 is already in use" | Stop conflicting process or run `./stop_all.sh` before `npm start` |

---

## 📚 Next Steps

1. ✅ Explore API endpoints (see README.md)
2. ✅ Register multiple students
3. ✅ Mark attendance and check records
4. ✅ Generate attendance reports
5. ✅ Deploy to cloud (Heroku, Vercel, AWS)

---

## 🎉 You're All Set!

Happy marking attendance! 🚀
