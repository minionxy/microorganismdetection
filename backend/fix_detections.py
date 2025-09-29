# backend/fix_detections.py
from app import create_app, db
from models.detection import Detection
import json

app = create_app()

with app.app_context():
    fixed = 0
    for detection in Detection.query.all():
        if detection.detected_organisms:
            try:
                # Try to parse the data
                data = json.loads(detection.detected_organisms)
                # If it's already valid, skip
                if isinstance(data, (list, dict)):
                    continue
            except:
                # If parsing fails, reset to empty list
                detection.detected_organisms = '[]'
                fixed += 1
        else:
            # If empty/None, set to empty list
            detection.detected_organisms = '[]'
            fixed += 1
    
    if fixed > 0:
        db.session.commit()
        print(f"Fixed {fixed} detections")
    else:
        print("No fixes needed")