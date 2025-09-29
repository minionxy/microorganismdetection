from app import create_app, db
from models.detection import Detection
import json
from collections import defaultdict

app = create_app()

with app.app_context():
    # Get count of detections
    count = Detection.query.count()
    print(f"Total detections in database: {count}")
    
    # Get the 5 most recent detections
    recent = Detection.query.order_by(Detection.timestamp.desc()).limit(5).all()
    
    print("\nRecent detections:")
    for d in recent:
        print(f"\nID: {d.id}")
        print(f"Filename: {d.filename}")
        print(f"Status: {d.status}")
        print(f"Timestamp: {d.timestamp}")
        print(f"Detected Organisms: {d.detected_organisms[:100]}...")  # First 100 chars
        print(f"Original Image: {d.original_image_path}")
        print(f"Processed Image: {d.processed_image_path}")
        print("-" * 50)
    print("\nTesting statistics:")
    all_detections = Detection.query.all()
    status_counts = defaultdict(int)
    organism_counts = defaultdict(int)
    
    for d in all_detections:
        status_counts[d.status] += 1
        
        if d.detected_organisms:
            try:
                orgs = json.loads(d.detected_organisms)
                if isinstance(orgs, list):
                    for org in orgs:
                        org_name = org.get('class') if isinstance(org, dict) else str(org)
                        organism_counts[org_name] += 1
            except:
                pass
    
    print("\nStatus counts:")
    for status, count in status_counts.items():
        print(f"{status}: {count}")
    
    print("\nOrganism counts:")
    for org, count in organism_counts.items():
        print(f"{org}: {count}")