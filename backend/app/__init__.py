"""
Application Factory
-------------------
Create and configure the Flask app. Using a factory function (instead of a
global app object) allows different configurations for development, testing,
and production, and prevents circular imports.
"""
from flask import Flask
from .config import config_by_name
from .extensions import db, jwt, socketio, migrate, token_blocklist


def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # -----------------------------------------------------------------
    # Bind extensions to this app instance
    # -----------------------------------------------------------------
    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    migrate.init_app(app, db)

    # -----------------------------------------------------------------
    # JWT callbacks
    # -----------------------------------------------------------------
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Return True to block this token (e.g. after logout)."""
        return jwt_payload["jti"] in token_blocklist

    @jwt.revoked_token_loader
    def revoked_token_response(jwt_header, jwt_payload):
        from flask import jsonify
        return jsonify({"error": "Token has been revoked. Please log in again."}), 401

    @jwt.expired_token_loader
    def expired_token_response(jwt_header, jwt_payload):
        from flask import jsonify
        return jsonify({"error": "Token has expired. Please log in again."}), 401

    @jwt.unauthorized_loader
    def missing_token_response(reason):
        from flask import jsonify
        return jsonify({"error": "Authentication required."}), 401

    # -----------------------------------------------------------------
    # Register blueprints (add more here as new phases are built)
    # -----------------------------------------------------------------
    from .auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from .api.dashboard import dashboard_bp
    from .api.tester import tester_bp
    from .api.maintenance import maintenance_bp
    from .api.admin import admin_bp
    from .api.troubleshooting import troubleshooting_bp
    from .api.layout import layout_bp
    app.register_blueprint(dashboard_bp,       url_prefix="/api/dashboard")
    app.register_blueprint(tester_bp,          url_prefix="/api/testers")
    app.register_blueprint(maintenance_bp,     url_prefix="/api/maintenance")
    app.register_blueprint(admin_bp,           url_prefix="/api/admin")
    app.register_blueprint(troubleshooting_bp, url_prefix="/api/troubleshooting")
    app.register_blueprint(layout_bp,          url_prefix="/api/layout")

    # -----------------------------------------------------------------
    # CLI commands
    # -----------------------------------------------------------------
    @app.cli.command("seed")
    def seed_command():
        """Populate the database with initial roles, permissions, and admin user."""
        from .seed import seed_database
        seed_database()

    @app.cli.command("resetstations")
    def resetstations_command():
        """Clear all testers/handlers and re-seed with the real production floor layout."""
        from .reseed import reset_stations
        reset_stations()

    return app
