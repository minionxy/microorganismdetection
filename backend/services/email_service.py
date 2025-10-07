from flask_mail import Message
from app import mail, app
from models import EmailLog, db
from datetime import datetime
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_detection_results_email(recipient_email, detection_id, results, gram_stained_image_path=None, detected_image_path=None):
    """Send detection results via email with enhanced formatting and error handling"""
    try:
        logger.info(f"Preparing to send email to {recipient_email} for detection {detection_id}")
        
        # Basic validation
        if not recipient_email or '@' not in recipient_email:
            raise ValueError(f"Invalid recipient email: {recipient_email}")
            
        if not results:
            results = {'organisms': [], 'recommendations': []}
            
        # Format the email body with HTML
        try:
            body = """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4a6cf7; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                    .section { margin-bottom: 20px; }
                    .organism { margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 4px; }
                    .confidence { color: #4a6cf7; font-weight: bold; }
                    .recommendation { color: #2e7d32; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Microorganism Detection Results</h2>
                        <p>Detection ID: {detection_id}</p>
                    </div>
                    <div class="content">
                        <div class="section">
                            <h3>🔬 Detected Microorganisms</h3>
                            <div class="organisms-list">
            """
            
            # Add detected organisms
            for org in results.get('organisms', []):
                org_name = org.get('name', 'Unknown')
                confidence = float(org.get('confidence', 0)) * 100
                body += f"""
                <div class="organism">
                    <strong>{org_name}</strong>
                    <div class="confidence">Confidence: {confidence:.1f}%</div>
                </div>
                """
            
            body += """
                            </div>
                        </div>
                        <div class="section">
                            <h3>💡 Recommendations</h3>
                            <ul>
            """
            
            # Add recommendations
            for rec in results.get('recommendations', []):
                body += f"<li class='recommendation'>{rec}</li>"
            
            # Add dashboard link
            dashboard_url = f"http://localhost:3000/detections/{detection_id}"
            body += f"""
                            </ul>
                        </div>
                        <div class="section">
                            <p>View detailed results in your <a href="{dashboard_url}">dashboard</a>.</p>
                            <p>Thank you for using our Microorganism Detection Service!</p>
                            <p><small>This is an automated message. Please do not reply to this email.</small></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """.format(detection_id=detection_id)
            
        except Exception as e:
            logger.error(f"Error formatting email body: {str(e)}")
            raise Exception(f"Failed to format email: {str(e)}")
        
        try:
            # Create and send email
            msg = Message(
                subject=f"Microorganism Detection Results - {detection_id}",
                recipients=[recipient_email],
                html=body,
                sender=app.config.get('MAIL_DEFAULT_SENDER', 'noreply@microdetection.com')
            )
            
            logger.info(f"Sending email to {recipient_email}")
            mail.send(msg)
            logger.info(f"Email sent successfully to {recipient_email}")
            
            # Log successful email
            log = EmailLog(
                recipient=recipient_email,
                detection_id=detection_id,
                sent_at=datetime.utcnow(),
                status='sent',
                result_summary=f"Sent results for {len(results.get('organisms', []))} organisms"
            )
            db.session.add(log)
            db.session.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise
            
    except Exception as e:
        # Log failed email attempt
        error_msg = str(e)
        logger.error(f"Email sending failed: {error_msg}")
        
        try:
            log = EmailLog(
                recipient=recipient_email,
                detection_id=detection_id,
                sent_at=datetime.utcnow(),
                status='failed',
                result_summary=error_msg[:500]  # Truncate to avoid database errors
            )
            db.session.add(log)
            db.session.commit()
        except Exception as db_error:
            logger.error(f"Failed to log email error: {str(db_error)}")
        
        return False