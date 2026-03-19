from flask import Blueprint

auth_bp = Blueprint("auth", __name__)

# Import routes AFTER creating the blueprint to avoid circular imports
from . import routes  # noqa: E402, F401
