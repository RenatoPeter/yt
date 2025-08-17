import os
import logging
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import get_config
from server import app as api_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__, static_folder='static')
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Configure CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Register API routes
    app.register_blueprint(api_app, url_prefix='/api')
    
    # Serve static files
    @app.route('/')
    def index():
        return send_from_directory('static', 'index.html')
    
    @app.route('/room.html')
    def room():
        return send_from_directory('static', 'room.html')
    
    @app.route('/<path:filename>')
    def static_files(filename):
        return send_from_directory('static', filename)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'version': '1.0.0'
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    config = get_config()
    
    logging.info(f"Starting YouTube Playlist Rooms Server in {os.environ.get('FLASK_ENV', 'development')} mode")
    logging.info(f"Server will be available at: http://{config.HOST}:{config.PORT}")
    
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
