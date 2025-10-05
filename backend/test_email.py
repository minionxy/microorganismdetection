from utils.email_service import send_detection_results
from flask import Flask

app = Flask(__name__)
app.config.from_object('config.Config')

with app.app_context():
    print(send_detection_results('gauthamkrishnar6@gmail.com', {'detections': [{'class': 'test_microbe', 'confidence': 0.99}]}, None))