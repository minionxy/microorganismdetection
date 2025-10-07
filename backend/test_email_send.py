from app import create_app, db
from models import Detection, EmailLog
from services.email_service import send_detection_results_email
from datetime import datetime, timedelta

app = create_app()

def test_email_sending():
    with app.app_context():
        # Test data
        test_results = {
            'organisms': [
                {'name': 'E. coli', 'confidence': 0.95},
                {'name': 'Giardia', 'confidence': 0.87}
            ],
            'recommendations': [
                'Boil water before drinking',
                'Use water purification tablets',
                'Avoid using for cooking without proper treatment'
            ]
        }
        
        print("Sending test email...")
        
        try:
            # Send test email
            success = send_detection_results_email(
                recipient_email='gauthamkrishnar6@gmail.com',  # Replace with your test email
                detection_id='test123',
                results=test_results,
                gram_stained_image_path=None,
                detected_image_path=None
            )
            
            if success:
                print("✅ Test email sent successfully! Check your inbox (and spam folder).")
            else:
                print("❌ Failed to send test email.")
                
        except Exception as e:
            print(f"❌ Error sending test email: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_email_sending()
