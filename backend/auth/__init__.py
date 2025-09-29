from flask import Blueprint
from flask_jwt_extended import JWTManager

jwt = JWTManager()
bp = Blueprint('auth', __name__)

def init_auth(app):
    app.config['JWT_SECRET_KEY'] = app.config.get('JWT_SECRET_KEY') or 'your-secret-key-here'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    jwt.init_app(app)
    return jwt