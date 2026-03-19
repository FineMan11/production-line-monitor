"""
Flask extension instances — created here WITHOUT binding to an app.
This prevents circular imports: models and routes can import from here safely.
The actual binding happens in create_app() inside app/__init__.py.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()
migrate = Migrate()

# In-memory JWT blocklist for logout.
# NOTE: This is cleared when the container restarts (Phase 1 limitation).
# Replace with Redis in a later phase for production use.
token_blocklist: set = set()
