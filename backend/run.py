"""
Application entry point.

Development (inside Docker):
    flask run --host=0.0.0.0

Production (Gunicorn with eventlet for WebSocket support):
    gunicorn --bind 0.0.0.0:5000 --worker-class eventlet -w 1 run:app
"""
import os
from app import create_app
from app.extensions import socketio

config_name = os.environ.get("FLASK_ENV", "development")
app = create_app(config_name)

if __name__ == "__main__":
    # Direct execution for local debugging (not used inside Docker)
    socketio.run(app, host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
