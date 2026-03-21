import sys
missing = []
ok = []

for mod in ['face_recognition', 'cv2', 'fastapi', 'uvicorn', 'sqlalchemy', 'PIL', 'pandas', 'openpyxl', 'reportlab']:
    try:
        __import__(mod)
        ok.append(mod)
    except ImportError as e:
        missing.append(f"{mod}: {e}")

with open('dep_check_result.txt', 'w') as f:
    f.write("OK: " + ", ".join(ok) + "\n")
    if missing:
        f.write("MISSING: " + "\n".join(missing) + "\n")
    else:
        f.write("All dependencies available!\n")

print("Done - see dep_check_result.txt")
