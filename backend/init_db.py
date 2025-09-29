from app import app, db
from models.user import User
import os

# Create uploads directory if it doesn't exist
os.makedirs('uploads', exist_ok=True)

def init_db():
    with app.app_context():
        try:
            # Drop all tables first (be careful with this in production)
            db.drop_all()
            
            # Create all tables
            db.create_all()
            
            # Create admin user if it doesn't exist
            if not User.query.filter_by(email='admin@example.com').first():
                admin = User(
                    email='admin@example.com',
                    name='Admin'
                )
                admin.set_password('admin123')
                db.session.add(admin)
                db.session.commit()
                print("Created admin user (email: admin@example.com, password: admin123)")
            
            print("Database tables created successfully!")
            print(f"Database file created at: {os.path.abspath('microorganism_detection.db')}")
            
        except Exception as e:
            print(f"Error initializing database: {str(e)}")
            if 'db' in locals():
                db.session.rollback()

if __name__ == '__main__':
    init_db()