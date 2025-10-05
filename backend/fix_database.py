from app import create_app, db
from models.detection import Detection
from datetime import datetime
import json

app = create_app()

with app.app_context():
    # 1. Create all tables
    print("🔄 Creating database tables...")
    db.create_all()
    
    # 2. Check if tables were created
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"✅ Database tables: {tables}")
    
    if 'detection' not in tables:
        print("❌ Detection table not found! Creating it now...")
        Detection.__table__.create(db.engine)
        print("✅ Detection table created!")
    
    # 3. Add a test detection if table is empty
    if Detection.query.count() == 0:
        print("➕ Adding test detection...")
        test_detection = Detection(
            filename="test.jpg",
            original_image_path="uploads/test.jpg",
            processed_image_path="uploads/processed_test.jpg",
            detected_organisms=json.dumps([{"name": "test_organism", "confidence": 0.95}]),
            water_usage_recommendations=json.dumps(["Test recommendation"]),
            timestamp=datetime.utcnow(),
            status="completed"
        )
        db.session.add(test_detection)
        db.session.commit()
        print("✅ Test detection added!")
    
    # 4. Show current detections
    print("\n📋 Current detections:")
    detections = Detection.query.all()
    for d in detections:
        print(f"ID: {d.id} | Status: {d.status} | Created: {d.timestamp}")
    
    print("\n🎉 Database check completed successfully!")