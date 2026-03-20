#!/usr/bin/env python3
"""
Quick Start Script - Smart Attendance System
Run this script to quickly set up and test the system
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def install_dependencies():
    """Install required Python packages"""
    print("Installing dependencies...")

    # Skip install if imports already work
    try:
        __import__("face_recognition")
        __import__("cv2")
        __import__("dlib")
        print("✓ Dependencies already available.\n")
        return True
    except Exception:
        pass

    prefer_fallback = platform.system() == "Darwin" and shutil.which("cmake") is None

    if not prefer_fallback:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("✓ Dependencies installed successfully!\n")
            return True
        except subprocess.CalledProcessError:
            print("✗ Standard install failed. Trying macOS fallback (prebuilt dlib)...")
    else:
        print("CMake not found. Using macOS fallback (prebuilt dlib)...")

    try:
        fallback_cmds = [
            [sys.executable, "-m", "pip", "install", "--user", "dlib-bin"],
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--user",
                "numpy==1.24.3",
                "Pillow==10.0.0",
                "opencv-python==4.8.1.78",
                "click==8.1.8",
                "face-recognition-models==0.3.0",
            ],
            [sys.executable, "-m", "pip", "install", "--user", "face-recognition==1.3.0", "--no-deps"],
        ]

        for cmd in fallback_cmds:
            subprocess.check_call(cmd)

        print("✓ Fallback dependency install succeeded!\n")
        return True
    except subprocess.CalledProcessError:
        print("✗ Failed to install dependencies")
        return False

def create_sample_data():
    """Create sample directory structure"""
    print("Setting up directories...")
    
    dirs = [
        'data/known_faces',
        'data/encodings',
        'logs'
    ]
    
    for dir_path in dirs:
        os.makedirs(dir_path, exist_ok=True)
    
    print("✓ Directories created/verified\n")

def main():
    py_cmd = Path(sys.executable).name or "python3"

    print("="*50)
    print("SMART ATTENDANCE SYSTEM - QUICK START")
    print("="*50 + "\n")
    
    # Check if we're in the right directory
    if not os.path.exists('main.py'):
        print("Error: Please run this script from the smart_attendance directory")
        sys.exit(1)
    
    # Step 1: Install dependencies
    if not install_dependencies():
        print("\nContinuing anyway...\n")
    
    # Step 2: Create directories
    create_sample_data()
    
    # Step 3: Instructions
    print("="*50)
    print("QUICK START GUIDE")
    print("="*50)
    print("\n1. Register faces:")
    print(f"   {py_cmd} main.py")
    print("   Choose option 1 and follow the prompts\n")
    
    print("2. Encode faces:")
    print(f"   {py_cmd} main.py")
    print("   Choose option 4\n")
    
    print("3. Start attendance:")
    print(f"   {py_cmd} main.py")
    print("   Choose option 3\n")
    
    print("4. View attendance:")
    print(f"   {py_cmd} main.py")
    print("   Choose option 5\n")
    
    print("="*50)
    print(f"Ready to start? Run: {py_cmd} main.py")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
