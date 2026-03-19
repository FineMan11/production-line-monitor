"""
Authentication API endpoints.

POST /api/auth/login    — Validate credentials, return JWT tokens
POST /api/auth/refresh  — Exchange a refresh token for a new access token
POST /api/auth/logout   — Revoke the current access token
GET  /api/auth/me       — Return the current user's details
"""
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from . import auth_bp
from app.extensions import db, token_blocklist
from app.models import User
from app.utils.audit import log_action


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Accepts: { "username": "...", "password": "..." }
    Returns: { "access_token": "...", "refresh_token": "...", "user": {...} }
    """
    data = request.get_json(silent=True)

    # Validate that the request body exists and has the required fields
    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"error": "Username and password are required."}), 400

    username = data["username"].strip()
    password = data["password"]

    user = User.query.filter_by(username=username).first()

    # Use a generic error message — don't reveal whether the username exists
    if not user or not user.check_password(password):
        log_action(
            user_id=None,
            action="user.login_failed",
            details={"username": username},
        )
        db.session.commit()
        return jsonify({"error": "Invalid username or password."}), 401

    if not user.is_active:
        log_action(
            user_id=user.id,
            action="user.login_blocked",
            resource=f"user:{user.id}",
            details={"reason": "account_disabled"},
        )
        db.session.commit()
        return jsonify({"error": "Your account has been disabled. Contact an administrator."}), 403

    # Embed the role in the JWT so we don't need a DB call on every request
    additional_claims = {"role": user.role.name}
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims,
    )
    refresh_token = create_refresh_token(identity=str(user.id))

    # Update last login time
    user.last_login = datetime.now(timezone.utc)

    log_action(
        user_id=user.id,
        action="user.login",
        resource=f"user:{user.id}",
    )
    db.session.commit()

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Exchange a refresh token for a new access token.
    The refresh token must be sent in the Authorization header as a Bearer token.
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user or not user.is_active:
        return jsonify({"error": "User not found or disabled."}), 401

    additional_claims = {"role": user.role.name}
    new_access_token = create_access_token(
        identity=user_id,
        additional_claims=additional_claims,
    )

    return jsonify({"access_token": new_access_token}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """
    Revoke the current access token by adding its JTI (unique ID) to the blocklist.
    After this, the token will be rejected even if it hasn't expired.
    """
    jwt_payload = get_jwt()
    jti = jwt_payload["jti"]
    token_blocklist.add(jti)

    user_id = get_jwt_identity()
    log_action(
        user_id=int(user_id),
        action="user.logout",
        resource=f"user:{user_id}",
    )
    db.session.commit()

    return jsonify({"message": "Successfully logged out."}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """
    Return the authenticated user's profile.
    Used by the frontend on page load to restore session state.
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({"error": "User not found."}), 404

    return jsonify({"user": user.to_dict()}), 200
