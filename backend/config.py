import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    FLASK_ENV = os.environ.get('FLASK_ENV') or 'development'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///microorganism_detection.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get('FLASK_ENV') == 'development'
    
    # File Upload Configuration
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # ML Model Configuration
    MODEL_PATH = os.environ.get('MODEL_PATH') or 'models/microorganism_yolov7_best.pt'
    CONFIDENCE_THRESHOLD = float(os.environ.get('CONFIDENCE_THRESHOLD', 0.5))
    IOU_THRESHOLD = float(os.environ.get('IOU_THRESHOLD', 0.45))
    
    # Roboflow Configuration
    ROBOFLOW_API_KEY = os.environ.get('ROBOFLOW_API_KEY')
    ROBOFLOW_WORKSPACE = os.environ.get('ROBOFLOW_WORKSPACE', 'himesama001')
    ROBOFLOW_PROJECT = os.environ.get('ROBOFLOW_PROJECT', 'microorganisms')
    ROBOFLOW_VERSION = int(os.environ.get('ROBOFLOW_VERSION', 7))
    
    # Server Configuration
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/app.log')
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_HEADERS = 'Content-Type'    
    # Directories
    BASE_DIR = Path(__file__).parent
    UPLOAD_DIR = BASE_DIR / UPLOAD_FOLDER
    PROCESSED_DIR = BASE_DIR / 'processed'
    MODELS_DIR = BASE_DIR / 'models'
    LOGS_DIR = BASE_DIR / 'logs'
    
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    


    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Email Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', '1', 't']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'gauthamkrishnar6@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'ovxr ptwu hslt fawi')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'gauthamkrishnar6@gmail.com')
    
    # Create directories if they don't exist
    def __init__(self):
        for directory in [self.UPLOAD_DIR, self.PROCESSED_DIR, self.MODELS_DIR, self.LOGS_DIR]:
            directory.mkdir(exist_ok=True)
    
    @staticmethod
    def init_app(app):
        """Initialize app with configuration"""
        # Create directories
        config = Config()
        
        # Setup logging
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug and not app.testing:
            if not config.LOGS_DIR.exists():
                config.LOGS_DIR.mkdir()
            
            file_handler = RotatingFileHandler(
                config.LOG_FILE, maxBytes=10240000, backupCount=10
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s'
            ))
            file_handler.setLevel(getattr(logging, config.LOG_LEVEL))
            app.logger.addHandler(file_handler)
            
            app.logger.setLevel(getattr(logging, config.LOG_LEVEL))
            app.logger.info('Microorganism Detection startup')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    
    # Use PostgreSQL in production
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://user:password@localhost/microorganism_detection'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}