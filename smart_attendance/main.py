import cv2
import time
import getpass
from face_recognition_module import FaceRecognitionSystem
from attendance_system import AttendanceSystem
from face_registration import FaceRegistration

class SmartAttendanceApp:
    """Main application for HPTU Attendance System"""
    
    def __init__(self):
        self.face_recognizer = FaceRecognitionSystem()
        self.attendance = AttendanceSystem()
        self.registration = FaceRegistration()
        self.running = False
        self.detection_cooldown = {}  # Prevent multiple detections for same person
        self.admin_users = {'admin': 'password'}  # Simple hardcoded admin users
    
    def admin_login(self):
        """Admin login or signup"""
        while True:
            print("\n" + "="*50)
            print("HPTU ATTENDANCE SYSTEM - ADMIN ACCESS")
            print("="*50)
            print("1. Login")
            print("2. Signup (create new admin)")
            print("3. Exit")
            print("="*50)
            
            choice = input("Enter your choice (1-3): ").strip()
            
            if choice == '1':
                return self.login()
            elif choice == '2':
                return self.signup()
            elif choice == '3':
                print("Exiting...")
                return False
            else:
                print("Invalid choice.")
    
    def login(self):
        """Login with existing credentials"""
        while True:
            username = input("Username: ").strip()
            password = input("Password: ").strip()  # Temporarily using input for testing
            
            if username in self.admin_users and self.admin_users[username] == password:
                print(f"Welcome, {username}!")
                return True
            else:
                print("Invalid credentials. Try again.")
    
    def signup(self):
        """Create new admin account"""
        while True:
            username = input("New username: ").strip()
            if username in self.admin_users:
                print("Username already exists.")
                continue
            
            password = getpass.getpass("New password: ")
            confirm_password = getpass.getpass("Confirm password: ")
            
            if password != confirm_password:
                print("Passwords do not match.")
                continue
            
            self.admin_users[username] = password
            print(f"Admin account '{username}' created successfully!")
            return True
    
    def run_attendance(self, confidence_threshold=0.6, model='hog'):
        """
        Run the attendance marking system using webcam
        
        Args:
            confidence_threshold: Minimum confidence to mark attendance
            model: 'hog' (faster) or 'cnn' (more accurate)
        """
        if not self.face_recognizer.known_encodings:
            print("Error: No faces registered. Please register faces first.")
            return
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Cannot access webcam")
            return
        
        # Set camera resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        self.running = True
        frame_count = 0
        face_results = []
        
        print("\n" + "="*50)
        print("HPTU ATTENDANCE SYSTEM - RUNNING")
        print("="*50)
        print("Press 'Q' to quit, 'S' for summary")
        print("="*50 + "\n")
        
        while self.running:
            ret, frame = cap.read()
            
            if not ret:
                print("Error reading frame")
                break
            
            # Mirror the frame
            frame = cv2.flip(frame, 1)
            
            # Process every 5th frame to save computation
            frame_count += 1
            if frame_count % 5 == 0:
                # Recognize faces
                face_results = self.face_recognizer.recognize_faces(
                    frame, 
                    tolerance=1-confidence_threshold,
                    model=model
                )
                
                # Mark attendance for recognized faces
                current_time = time.time()
                for result in face_results:
                    name = result['name']
                    confidence = result['confidence']
                    
                    if name != "Unknown" and confidence >= confidence_threshold:
                        # Apply cooldown to prevent duplicate marking
                        if name not in self.detection_cooldown or \
                           current_time - self.detection_cooldown[name] > 5:
                            if self.attendance.mark_attendance(name, 'Present'):
                                print(f"✓ {name} marked present ({confidence:.2f})")
                                self.detection_cooldown[name] = current_time
                
                # Draw faces on frame
                frame = self.face_recognizer.draw_faces(frame, face_results)
            
            # Display info
            cv2.putText(frame, f"Detected: {len(face_results)}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, "Q: Quit | S: Summary", (10, 70),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
            
            cv2.imshow("HPTU Attendance System", frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q') or key == ord('Q'):
                self.running = False
                print("\nStopping attendance system...")
            
            elif key == ord('s') or key == ord('S'):
                self.attendance.print_summary()
        
        cap.release()
        cv2.destroyAllWindows()
        
        self.attendance.print_summary()
    
    def interactive_menu(self):
        """Interactive menu for the application"""
        while True:
            print("\n" + "="*50)
            print("HPTU ATTENDANCE SYSTEM - MENU")
            print("="*50)
            print("1. Register new face")
            print("2. View registered people")
            print("3. Start attendance marking")
            print("4. Encode registered faces")
            print("5. View today's attendance")
            print("6. Delete registered person")
            print("7. Exit")
            print("="*50)
            
            choice = input("Enter your choice (1-7): ").strip()
            
            if choice == '1':
                name = input("Enter person's name: ").strip()
                if name:
                    num_samples = input("Number of samples to capture (default 5): ").strip()
                    num_samples = int(num_samples) if num_samples.isdigit() else 5
                    self.registration.capture_faces(name, num_samples)
                else:
                    print("Invalid name")
            
            elif choice == '2':
                self.registration.list_registered_people()
            
            elif choice == '3':
                conf = input("Confidence threshold (0.0-1.0, default 0.6): ").strip()
                try:
                    confidence_threshold = float(conf) if conf else 0.6
                except ValueError:
                    print("Invalid number, using default 0.6")
                    confidence_threshold = 0.6
                confidence_threshold = max(0.0, min(1.0, confidence_threshold))
                
                model = input("Face detection model (hog/cnn, default hog): ").strip().lower()
                model = model if model in ['hog', 'cnn'] else 'hog'
                
                self.run_attendance(confidence_threshold, model)
            
            elif choice == '4':
                if self.face_recognizer.encode_known_faces():
                    print("✓ Faces encoded successfully!")
                else:
                    print("✗ Failed to encode faces")
            
            elif choice == '5':
                self.attendance.print_summary()
            
            elif choice == '6':
                name = input("Enter person's name to delete: ").strip()
                if name:
                    confirm = input(f"Delete '{name}'? (y/n): ").strip().lower()
                    if confirm == 'y':
                        self.registration.delete_person(name)
            
            elif choice == '7':
                print("Exiting...")
                break
            
            else:
                print("Invalid choice. Please try again.")

def main():
    """Main entry point"""
    app = SmartAttendanceApp()
    
    try:
        if app.admin_login():
            app.interactive_menu()
        else:
            print("Access denied.")
    except KeyboardInterrupt:
        print("\n\nExiting...")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
