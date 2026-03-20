import cv2
import face_recognition
import numpy as np
import os
import pickle
from pathlib import Path

class FaceRecognitionSystem:
    """Handles face detection and recognition using face_recognition library"""
    
    def __init__(self, encodings_file='data/encodings/face_encodings.pkl', 
                 known_faces_dir='data/known_faces'):
        self.encodings_file = encodings_file
        self.known_faces_dir = known_faces_dir
        self.known_encodings = []
        self.known_names = []
        self.load_encodings()
    
    def load_encodings(self):
        """Load pre-computed face encodings"""
        if os.path.exists(self.encodings_file):
            try:
                with open(self.encodings_file, 'rb') as f:
                    data = pickle.load(f)
                    self.known_encodings = data['encodings']
                    self.known_names = data['names']
                print(f"Loaded {len(self.known_encodings)} face encodings")
            except Exception as e:
                print(f"Error loading encodings: {e}")
                self.known_encodings = []
                self.known_names = []
        else:
            print("No encodings file found. Please register faces first.")
    
    def encode_known_faces(self):
        """Scan known_faces directory and create encodings"""
        known_encodings = []
        known_names = []
        
        if not os.path.exists(self.known_faces_dir):
            os.makedirs(self.known_faces_dir)
            print(f"Created {self.known_faces_dir} directory. Please add face images.")
            return False
        
        for person_name in os.listdir(self.known_faces_dir):
            person_dir = os.path.join(self.known_faces_dir, person_name)
            
            if not os.path.isdir(person_dir):
                continue
            
            print(f"Encoding faces for {person_name}...")
            
            for image_name in os.listdir(person_dir):
                image_path = os.path.join(person_dir, image_name)
                
                try:
                    # Load image
                    image = face_recognition.load_image_file(image_path)
                    
                    # Get face encodings
                    face_encodings = face_recognition.face_encodings(image)
                    
                    for face_encoding in face_encodings:
                        known_encodings.append(face_encoding)
                        known_names.append(person_name)
                        print(f"  ✓ Encoded {image_name}")
                
                except Exception as e:
                    print(f"  ✗ Error processing {image_name}: {e}")
        
        # Save encodings
        if known_encodings:
            data = {'encodings': known_encodings, 'names': known_names}
            os.makedirs(os.path.dirname(self.encodings_file), exist_ok=True)
            with open(self.encodings_file, 'wb') as f:
                pickle.dump(data, f)
            
            self.known_encodings = known_encodings
            self.known_names = known_names
            print(f"Saved {len(known_encodings)} encodings")
            return True
        else:
            print("No faces found in known_faces directory")
            return False
    
    def recognize_faces(self, frame, tolerance=0.6, model='hog'):
        """
        Detect and recognize faces in a frame
        
        Args:
            frame: Input image/frame
            tolerance: How much distance between faces to consider a match (lower = stricter)
            model: 'hog' (faster, CPU) or 'cnn' (more accurate, needs GPU)
        
        Returns:
            List of tuples: (name, top, right, bottom, left, confidence)
        """
        if not self.known_encodings:
            print("No known faces loaded")
            return []
        
        # Convert BGR to RGB (OpenCV uses BGR)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Resize frame for faster processing
        small_frame = cv2.resize(rgb_frame, (0, 0), fx=0.25, fy=0.25)
        
        # Find faces in the frame
        face_locations = face_recognition.face_locations(small_frame, model=model)
        face_encodings = face_recognition.face_encodings(small_frame, face_locations)
        
        results = []
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare with known faces
            matches = face_recognition.compare_faces(
                self.known_encodings, 
                face_encoding, 
                tolerance=tolerance
            )
            distances = face_recognition.face_distance(
                self.known_encodings, 
                face_encoding
            )
            
            name = "Unknown"
            confidence = 0.0
            
            # Find best match
            if len(distances) > 0:
                best_match_index = np.argmin(distances)
                if matches[best_match_index]:
                    name = self.known_names[best_match_index]
                    confidence = 1 - distances[best_match_index]
            
            # Scale back to original frame size
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4
            
            results.append({
                'name': name,
                'confidence': confidence,
                'location': (top, right, bottom, left)
            })
        
        return results
    
    def draw_faces(self, frame, face_results):
        """Draw face boxes and names on frame"""
        for result in face_results:
            name = result['name']
            confidence = result['confidence']
            top, right, bottom, left = result['location']
            
            # Choose color based on recognition
            if name != "Unknown":
                color = (0, 255, 0)  # Green for recognized
                label = f"{name} ({confidence:.2f})"
            else:
                color = (0, 0, 255)  # Red for unknown
                label = "Unknown"
            
            # Draw box
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            
            # Draw label background
            label_y = top - 10 if top > 30 else bottom + 25
            cv2.rectangle(frame, (left, label_y - 25), (right, label_y), color, cv2.FILLED)
            cv2.putText(frame, label, (left + 6, label_y - 6), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
        
        return frame
