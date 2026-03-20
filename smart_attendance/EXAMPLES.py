"""
Example Usage Scenarios for Smart Attendance System
"""

# Example 1: Register a new person
# ================================
# from face_registration import FaceRegistration
# 
# registration = FaceRegistration()
# registration.capture_faces("Alice", num_samples=5)


# Example 2: Encode registered faces
# ===================================
# from face_recognition_module import FaceRecognitionSystem
# 
# recognizer = FaceRecognitionSystem()
# recognizer.encode_known_faces()


# Example 3: Recognize faces in an image
# ========================================
# import cv2
# from face_recognition_module import FaceRecognitionSystem
# 
# recognizer = FaceRecognitionSystem()
# 
# # Load image
# image = cv2.imread("path/to/image.jpg")
# 
# # Recognize faces
# results = recognizer.recognize_faces(image)
# 
# # Draw and display
# frame = recognizer.draw_faces(image, results)
# cv2.imshow("Recognition Results", frame)
# cv2.waitKey(0)


# Example 4: Mark attendance manually
# ====================================
# from attendance_system import AttendanceSystem
# 
# attendance = AttendanceSystem()
# 
# # Mark someone as present
# if attendance.mark_attendance("Alice", "Present"):
#     print("Attendance marked!")
# 
# # Get today's summary
# summary = attendance.get_attendance_summary()
# attendance.print_summary()


# Example 5: Get attendance report for specific date
# ==================================================
# from attendance_system import AttendanceSystem
# 
# attendance = AttendanceSystem()
# report = attendance.get_attendance_report("2026-03-20")
# 
# for record in report:
#     print(f"{record['Name']}: {record['Time']} - {record['Status']}")


# Example 6: Advanced webcam recognition
# =======================================
# import cv2
# from face_recognition_module import FaceRecognitionSystem
# 
# recognizer = FaceRecognitionSystem()
# cap = cv2.VideoCapture(0)
# 
# while True:
#     ret, frame = cap.read()
#     
#     # Recognize with CNN model (more accurate)
#     results = recognizer.recognize_faces(frame, model='cnn')
#     
#     # Draw results
#     frame = recognizer.draw_faces(frame, results)
#     
#     cv2.imshow("Live Recognition", frame)
#     
#     if cv2.waitKey(1) & 0xFF == ord('q'):
#         break
# 
# cap.release()
# cv2.destroyAllWindows()


# Example 7: Batch process multiple images
# =========================================
# import cv2
# import os
# from face_recognition_module import FaceRecognitionSystem
# 
# recognizer = FaceRecognitionSystem()
# 
# image_dir = "path/to/images"
# 
# for image_name in os.listdir(image_dir):
#     image_path = os.path.join(image_dir, image_name)
#     image = cv2.imread(image_path)
#     
#     results = recognizer.recognize_faces(image)
#     
#     print(f"\n{image_name}:")
#     for result in results:
#         name = result['name']
#         confidence = result['confidence']
#         print(f"  {name}: {confidence:.2%}")


# Example 8: List all registered people
# ======================================
# from face_registration import FaceRegistration
# 
# registration = FaceRegistration()
# people = registration.list_registered_people()


# Example 9: Delete a registered person
# ======================================
# from face_registration import FaceRegistration
# 
# registration = FaceRegistration()
# registration.delete_person("Alice")


# Example 10: Custom confidence threshold
# ========================================
# from face_recognition_module import FaceRecognitionSystem
# import cv2
# 
# recognizer = FaceRecognitionSystem()
# cap = cv2.VideoCapture(0)
# 
# # Only recognize with 80% confidence or higher
# while True:
#     ret, frame = cap.read()
#     results = recognizer.recognize_faces(frame, tolerance=0.2)  # tolerance = 1 - confidence
#     
#     # Filter by confidence
#     high_confidence = [r for r in results if r['confidence'] >= 0.8]
#     
#     frame = recognizer.draw_faces(frame, high_confidence)
#     cv2.imshow("High Confidence Only", frame)
#     
#     if cv2.waitKey(1) & 0xFF == ord('q'):
#         break
# 
# cap.release()
# cv2.destroyAllWindows()
