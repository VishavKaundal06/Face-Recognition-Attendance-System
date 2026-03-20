import csv
import os
from datetime import datetime
from pathlib import Path

class AttendanceSystem:
    """Manages attendance logging and marking"""
    
    def __init__(self, log_dir='logs'):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        self.today_date = datetime.now().strftime('%Y-%m-%d')
        self.attendance_file = os.path.join(log_dir, f'attendance_{self.today_date}.csv')
        self.marked_today = set()
        self.initialize_file()
    
    def initialize_file(self):
        """Create attendance file if it doesn't exist"""
        if not os.path.exists(self.attendance_file):
            with open(self.attendance_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['Name', 'Date', 'Time', 'Status'])
    
    def mark_attendance(self, name, status='Present'):
        """
        Mark attendance for a person
        
        Args:
            name: Person's name
            status: 'Present', 'Late', 'Absent', etc.
        
        Returns:
            bool: True if marked successfully, False if already marked
        """
        if name == "Unknown":
            return False
        
        # Create a unique key to track who's been marked today
        key = name.lower()
        
        if key in self.marked_today:
            return False  # Already marked today
        
        current_time = datetime.now().strftime('%H:%M:%S')
        
        try:
            with open(self.attendance_file, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([name, self.today_date, current_time, status])
            
            self.marked_today.add(key)
            return True
        except Exception as e:
            print(f"Error marking attendance: {e}")
            return False
    
    def get_attendance_summary(self):
        """Get today's attendance summary"""
        summary = {}
        
        if not os.path.exists(self.attendance_file):
            return summary
        
        try:
            with open(self.attendance_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row['Name']
                    if name not in summary:
                        summary[name] = {
                            'time': row['Time'],
                            'status': row['Status']
                        }
        except Exception as e:
            print(f"Error reading attendance: {e}")
        
        return summary
    
    def get_attendance_report(self, date=None):
        """Get attendance report for a specific date"""
        if date is None:
            date = self.today_date
        
        report_file = os.path.join(self.log_dir, f'attendance_{date}.csv')
        report = []
        
        if not os.path.exists(report_file):
            print(f"No attendance record for {date}")
            return report
        
        try:
            with open(report_file, 'r') as f:
                reader = csv.DictReader(f)
                report = list(reader)
        except Exception as e:
            print(f"Error reading report: {e}")
        
        return report
    
    def print_summary(self):
        """Print today's attendance summary"""
        summary = self.get_attendance_summary()
        
        print("\n" + "="*50)
        print(f"ATTENDANCE SUMMARY - {self.today_date}")
        print("="*50)
        
        if not summary:
            print("No attendance records yet")
        else:
            print(f"{'Name':<25} {'Time':<12} {'Status':<10}")
            print("-"*50)
            for name, info in sorted(summary.items()):
                print(f"{name:<25} {info['time']:<12} {info['status']:<10}")
        
        print("="*50 + "\n")
