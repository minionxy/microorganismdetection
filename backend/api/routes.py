from flask import Blueprint, jsonify
import json
from models.detection import Detection

bp = Blueprint('api', __name__)

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