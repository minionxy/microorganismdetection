import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from flask import current_app, render_template
from pathlib import Path

def send_detection_results(recipient_email, detection_data, image_path=None):
    """
    Send detection results via email
    
    Args:
        recipient_email (str): Email address of the recipient
        detection_data (dict): Dictionary containing detection results
        image_path (str, optional): Path to the processed image with detections
    """
    # Create message container
    msg = MIMEMultipart()
    msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
    msg['To'] = recipient_email
    msg['Subject'] = 'Microorganism Detection Results'
    
    # Format detection results
    results_text = ""
    for i, detection in enumerate(detection_data.get('detections', []), 1):
        results_text += f"{i}. {detection.get('class')} - {detection.get('confidence', 0) * 100:.2f}% confidence\n"
    
    # Create HTML content
        count = len(detection_data.get('detections', []))
        html = f"""
        <html>
            <body>
                <h2>Microorganism Detection Results</h2>
                <p>Here are the results of your microorganism detection:</p>
                <pre>{results_text}</pre>
                <p>Total detections: {count}</p>
                <p>Thank you for using our service!</p>
            </body>
        </html>
        """
    
    # Attach HTML content
    msg.attach(MIMEText(html, 'html'))
    
    # Attach image if provided
    if image_path and os.path.exists(image_path):
        with open(image_path, 'rb') as img:
            img_data = img.read()
            image = MIMEImage(img_data, name=os.path.basename(image_path))
            msg.attach(image)
    
    # Send the email
    try:
        with smtplib.SMTP(
            current_app.config['MAIL_SERVER'], 
            current_app.config['MAIL_PORT']
        ) as server:
            if current_app.config['MAIL_USE_TLS']:
                server.starttls()
            if current_app.config['MAIL_USERNAME'] and current_app.config['MAIL_PASSWORD']:
                server.login(
                    current_app.config['MAIL_USERNAME'],
                    current_app.config['MAIL_PASSWORD']
                )
            server.send_message(msg)
        print(f"[EMAIL SERVICE] Email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"[EMAIL SERVICE] Failed to send email to {recipient_email}: {str(e)}")
        current_app.logger.error(f"Failed to send email: {str(e)}")
        return False
