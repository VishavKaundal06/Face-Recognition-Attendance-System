import cv2
import os
from pathlib import Path

class FaceRegistration:
    """Register new faces by capturing them from webcam"""
    
    def __init__(self, known_faces_dir='data/known_faces'):
        self.known_faces_dir = known_faces_dir
        os.makedirs(known_faces_dir, exist_ok=True)
    
    def capture_faces(self, name, num_samples=5):
        """
        Capture face samples from webcam for a person
        
        Args:
            name: Person's name
            num_samples: Number of face samples to capture
        """
        person_dir = os.path.join(self.known_faces_dir, name)
        os.makedirs(person_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Cannot access webcam")
            return False
        
        print(f"\nCapturing {num_samples} samples for {name}")
        print("Press SPACE to capture, Q to cancel")
        
        captured = 0
        
        while captured < num_samples:
            ret, frame = cap.read()
            
            if not ret:
                print("Error reading frame")
                break
            
            # Mirror the frame
            frame = cv2.flip(frame, 1)
            
            # Add instructions
            cv2.putText(frame, f"Captured: {captured}/{num_samples}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, "Press SPACE to capture, Q to quit", (10, 70),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
            
            cv2.imshow(f"Registering {name}", frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord(' '):  # SPACE key
                image_path = os.path.join(person_dir, f"{name}_{captured}.jpg")
                cv2.imwrite(image_path, frame)
                print(f"✓ Captured {captured + 1}/{num_samples}")
                captured += 1
            
            elif key == ord('q') or key == ord('Q'):  # Q key
                print("Registration cancelled")
                cap.release()
                cv2.destroyAllWindows()
                return False
        
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"✓ Successfully registered {name} with {num_samples} samples\n")
        return True
    
    def list_registered_people(self):
        """List all registered people"""
        if not os.path.exists(self.known_faces_dir):
            print("No faces registered yet")
            return []
        
        people = []
        for person_name in os.listdir(self.known_faces_dir):
            person_dir = os.path.join(self.known_faces_dir, person_name)
            if os.path.isdir(person_dir):
                num_images = len(os.listdir(person_dir))
                people.append((person_name, num_images))
        
        if people:
            print("\nRegistered People:")
            print("-" * 40)
            for name, count in sorted(people):
                print(f"{name:<30} ({count} samples)")
            print("-" * 40 + "\n")
        else:
            print("No people registered yet\n")
        
        return people
    
    def delete_person(self, name):
        """Delete a registered person's data"""
        person_dir = os.path.join(self.known_faces_dir, name)
        
        if not os.path.exists(person_dir):
            print(f"Person '{name}' not found")
            return False
        
        try:
            import shutil
            shutil.rmtree(person_dir)
            print(f"✓ Deleted {name}'s registration")
            return True
        except Exception as e:
            print(f"Error deleting {name}: {e}")
            return False
