"""
Single import point for all models.
Usage anywhere in the app:
    from app.models import User, Role, Permission, AuditLog
    from app.models import Status, Tester, StatusHistory, Handler, MaintenanceLog

Import order matters: Status and Tester must come before Handler and StatusHistory
because of FK dependencies that Alembic needs to resolve.
"""
from .role import Role, Permission
from .user import User
from .audit_log import AuditLog
from .status import Status
from .tester import Tester, StatusHistory
from .handler import Handler
from .maintenance import MaintenanceLog
from .troubleshooting import TroubleshootingSession, TroubleshootingStep

__all__ = [
    "User", "Role", "Permission", "AuditLog",
    "Status", "Tester", "StatusHistory",
    "Handler", "MaintenanceLog",
    "TroubleshootingSession", "TroubleshootingStep",
]
