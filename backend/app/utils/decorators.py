"""
RBAC decorator for protecting endpoints by user role.

Usage:
    from app.utils.decorators import role_required

    @app.route("/api/admin/users")
    @role_required("admin")
    def list_users():
        ...

    @app.route("/api/analytics")
    @role_required("admin", "supervisor")
    def analytics():
        ...

The role is read from JWT claims (set at login time), so no database
call is needed on every request.
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(*roles: str):
    """
    Decorator that checks the user has one of the specified roles.
    Handles JWT verification internally — no need to also use @jwt_required().
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verify the JWT is present and valid (raises exception if not)
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")
            if user_role not in roles:
                return jsonify({
                    "error": "You do not have permission to access this resource."
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
