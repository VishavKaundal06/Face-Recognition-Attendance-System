import requests
import json

BASE_URL = "http://localhost:5050/api"
DESCRIPTOR = [0.1] * 128

def test_flow():
    # 1. Register student
    print("\n1. Registering student...")
    reg_data = {
        "name": "Vishav",
        "rollNumber": "21CS001",
        "email": "vishav@example.com",
        "phone": "9876543210",
        "course": "B.Tech",
        "branch": "Computer Science",
        "department": "Computer Science",
        "year": 3,
        "semester": 6,
        "faceDescriptor": DESCRIPTOR
    }
    r = requests.post(f"{BASE_URL}/students/self-register", json=reg_data)
    print(r.text)
    student_id = r.json()['data']['_id']
    
    # 2. Recognize student
    print("\n2. Recognizing student...")
    rec_data = { "faceDescriptor": DESCRIPTOR, "threshold": 0.6 }
    r = requests.post(f"{BASE_URL}/students/recognize", json=rec_data)
    print(r.text)
    
    # 3. Mark attendance
    print("\n3. Marking attendance...")
    mark_data = {
        "studentId": student_id,
        "status": "present",
        "confidence": 95
    }
    r = requests.post(f"{BASE_URL}/attendance/mark", json=mark_data)
    print(r.text)
    
    # 4. Check recent attendance
    print("\n4. Checking history...")
    r = requests.get(f"{BASE_URL}/attendance/recent")
    print(r.text)

if __name__ == "__main__":
    test_flow()
