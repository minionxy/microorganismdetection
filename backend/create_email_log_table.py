from app import create_app, db
from models import EmailLog

app = create_app()

with app.app_context():
    try:
        # Create the email_log table
        EmailLog.__table__.create(db.engine)
        print("✅ email_log table created successfully!")
    except Exception as e:
        print(f"❌ Error creating email_log table: {str(e)}")