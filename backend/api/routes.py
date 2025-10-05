
from flask import Blueprint, jsonify, request
import json
from models.detection import Detection
from utils.email_service import send_detection_results
from models import EmailLog

bp = Blueprint('api', __name__)

# List detections with status and details
@bp.route('/detections', methods=['GET'])
def list_detections():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    detections = Detection.query.order_by(Detection.timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)
    detection_list = []
    for d in detections.items:
        det = d.to_dict()
        # Find latest email log for this detection
        email_log = EmailLog.query.filter_by(detection_id=str(d.id)).order_by(EmailLog.sent_at.desc()).first()
        if email_log:
            det['email_status'] = email_log.status
            det['email_sent_at'] = email_log.sent_at.isoformat() if email_log.sent_at else None
            det['email_recipient'] = email_log.recipient
        else:
            det['email_status'] = 'never_sent'
            det['email_sent_at'] = None
            det['email_recipient'] = None
        detection_list.append(det)
    return jsonify({
        'detections': detection_list,
        'total': detections.total,
        'page': detections.page,
        'pages': detections.pages
    })

# Email logs endpoint
@bp.route('/email-logs', methods=['GET'])
def get_email_logs():
    # Optional: support ?limit=20
    limit = request.args.get('limit', 20, type=int)
    logs = EmailLog.query.order_by(EmailLog.sent_at.desc()).limit(limit).all()
    return jsonify([log.to_dict() for log in logs])

# Send detection results via email
@bp.route('/send-results-email', methods=['POST'])
def send_results_email():
    data = request.get_json()
    email = data.get('email')
    detection_id = data.get('detection_id')
    if not email or not detection_id:
        return jsonify({'error': 'Missing email or detection_id'}), 400
    detection = Detection.query.filter_by(id=detection_id).first()
    if not detection:
        return jsonify({'error': 'Detection not found'}), 404
    detection_data = detection.to_dict()
    # Use processed image if available
    image_path = detection_data.get('processed_image_path')
    from models import EmailLog, db
    from datetime import datetime
    # Prepare result summary (short text)
    summary = f"{len(detection_data.get('detections', []))} detections: "
    summary += ', '.join([d.get('class', 'unknown') for d in detection_data.get('detections', [])])
    success = send_detection_results(email, detection_data, image_path)
    log = EmailLog(
        recipient=email,
        detection_id=str(detection_id),
        sent_at=datetime.utcnow(),
        status='success' if success else 'failure',
        result_summary=summary
    )
    db.session.add(log)
    db.session.commit()
    if success:
        return jsonify({'message': 'Detection results sent successfully'}), 200
    else:
        return jsonify({'error': 'Failed to send email'}), 500


@bp.route('/statistics', methods=['GET'])
def get_statistics():
    try:
        total_detections = Detection.query.count()
        completed_detections = Detection.query.filter_by(status='completed').count()
        failed_detections = Detection.query.filter_by(status='failed').count()

        # Success rate (percentage)
        success_rate = (completed_detections / total_detections * 100) if total_detections > 0 else 0.0

        # Build organism statistics from completed detections
        organism_statistics = {}
        completed_list = Detection.query.filter_by(status='completed').order_by(Detection.timestamp.desc()).all()
        for d in completed_list:
            raw = d.detected_organisms
            try:
                data = json.loads(raw) if isinstance(raw, str) else raw
            except Exception:
                data = []
            if not data:
                continue
            # Support list of dicts (detailed objects) or list of strings
            for item in data:
                if isinstance(item, dict):
                    key = item.get('class') or item.get('name') or 'unknown'
                else:
                    key = str(item)
                organism_statistics[key] = organism_statistics.get(key, 0) + 1

        # Latest completed detections (limited)
        latest = completed_list[:5]
        latest_data = [d.to_dict() for d in latest]

        return jsonify({
            'total_detections': total_detections,
            'completed_detections': completed_detections,
            'failed_detections': failed_detections,
            'success_rate': success_rate,
            'organism_statistics': organism_statistics,
            'latest_detections': latest_data
        }), 200
    except Exception as e:
        print(f"Error getting statistics: {str(e)}")
        return jsonify({'error': 'Failed to get statistics', 'details': str(e)}), 500