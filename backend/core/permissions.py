from django.conf import settings
from rest_framework import permissions, exceptions
from core.models import WorkspaceMembership, Workspace


class RolePermissionPolicy:
    """
    Studio Role-Based Access Control (RBAC) permission policy.
    Industry production roles:
    - OWNER (Studio Executive / Owner)
    - PRODUCER (Producer)
    - DIRECTOR (Director)
    - WRITER (Writer)
    - DEPT_HEAD (Head of Department)
    - ACTOR (Actor)
    """

    SCRIPT_EDITORS = {"OWNER", "PRODUCER", "DIRECTOR", "WRITER"}
    BUDGET_EDITORS = {"OWNER", "PRODUCER"}
    SCENE_LOCKERS = {"OWNER", "PRODUCER", "DIRECTOR"}
    MEMBER_MANAGERS = {"OWNER", "PRODUCER"}

    @classmethod
    def can_edit_script(cls, role: str) -> bool:
        if not role:
            return False
        return role.upper() in cls.SCRIPT_EDITORS

    @classmethod
    def can_edit_budget(cls, role: str) -> bool:
        if not role:
            return False
        return role.upper() in cls.BUDGET_EDITORS

    @classmethod
    def can_lock_scenes(cls, role: str) -> bool:
        if not role:
            return False
        return role.upper() in cls.SCENE_LOCKERS

    @classmethod
    def can_manage_members(cls, role: str) -> bool:
        if not role:
            return False
        return role.upper() in cls.MEMBER_MANAGERS

    @classmethod
    def get_capabilities(cls, role: str) -> dict:
        r = (role or "WRITER").upper()
        return {
            "can_edit_script": cls.can_edit_script(r),
            "can_edit_budget": cls.can_edit_budget(r),
            "can_lock_scenes": cls.can_lock_scenes(r),
            "can_manage_members": cls.can_manage_members(r),
        }


def get_user_workspace_role(request, workspace_id=None, obj=None) -> str:
    """
    Resolves the user's role in the given workspace.
    Priority:
    1. If request.user is authenticated, query active WorkspaceMembership.
    2. When settings.DEBUG is True:
       - Header 'X-Workspace-Role' / request.META['HTTP_X_WORKSPACE_ROLE']
       - Query parameter 'role'
       - Header 'X-User-Email' / request.META['HTTP_X_USER_EMAIL']
    3. Fallback: 'ACTOR' (read-only safe methods for unauthenticated callers).
    """
    if not request:
        return "ACTOR"

    # Extract workspace_id if not explicitly provided
    if not workspace_id:
        if obj is not None:
            if hasattr(obj, "workspace_id") and obj.workspace_id:
                workspace_id = obj.workspace_id
            elif hasattr(obj, "workspace") and obj.workspace:
                workspace_id = getattr(obj.workspace, "id", None) or obj.workspace
            elif isinstance(obj, Workspace):
                workspace_id = obj.id

    if not workspace_id:
        try:
            workspace_id = (
                (request.data.get("workspace") if hasattr(request, "data") and isinstance(request.data, dict) else None)
                or (request.data.get("workspace_id") if hasattr(request, "data") and isinstance(request.data, dict) else None)
                or (request.query_params.get("workspace") if hasattr(request, "query_params") else None)
                or (request.query_params.get("workspace_id") if hasattr(request, "query_params") else None)
            )
        except Exception:
            pass

    # 1. Check authenticated user's active membership
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        if getattr(user, "is_superuser", False):
            return "OWNER"

        qs = WorkspaceMembership.objects.filter(user=user, is_active=True)
        if workspace_id:
            membership = qs.filter(workspace_id=workspace_id).first()
            if membership:
                return membership.role.upper()

        membership = qs.first()
        if membership:
            return membership.role.upper()

        if getattr(user, "email", None):
            email_qs = WorkspaceMembership.objects.filter(
                email__iexact=user.email.strip(), is_active=True
            )
            if workspace_id:
                m_email = email_qs.filter(workspace_id=workspace_id).first()
                if m_email:
                    return m_email.role.upper()
            m_email = email_qs.first()
            if m_email:
                return m_email.role.upper()

    # 2. In debug mode only (settings.DEBUG=True), allow explicit role headers / query params
    if getattr(settings, "DEBUG", False):
        header_role = (
            (request.headers.get("X-Workspace-Role") if hasattr(request, "headers") else None)
            or (request.META.get("HTTP_X_WORKSPACE_ROLE") if hasattr(request, "META") else None)
        )
        if header_role:
            return header_role.strip().upper()

        if hasattr(request, "query_params"):
            param_role = request.query_params.get("role")
            if param_role:
                return param_role.strip().upper()

        # 3. Check X-User-Email header
        email_header = (
            (request.headers.get("X-User-Email") if hasattr(request, "headers") else None)
            or (request.META.get("HTTP_X_USER_EMAIL") if hasattr(request, "META") else None)
        )
        if email_header:
            qs = WorkspaceMembership.objects.filter(email__iexact=email_header.strip(), is_active=True)
            if workspace_id:
                qs = qs.filter(workspace_id=workspace_id)
            m = qs.first()
            if m:
                return m.role.upper()

    # Default fallback for unauthenticated callers or callers without active membership:
    return "ACTOR"


class HasWorkspaceRole(permissions.BasePermission):
    """
    Validates studio workspace role permissions against the requested action.
    - OWNER / PRODUCER: Unrestricted access across workspace settings, budgets, and all nodes.
    - DIRECTOR: Full editing on script nodes and authority to toggle is_locked.
    - WRITER: May create and edit unlocked script nodes, but cannot toggle is_locked or modify budgets.
    - DEPT_HEAD / ACTOR: Read-only access to nodes (SAFE_METHODS), allowed to manage ScriptNote annotations.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        role = get_user_workspace_role(request)
        view_name = view.__class__.__name__

        # DEPT_HEAD and ACTOR have read-only access to nodes and budgets, but can manage notes
        if role in ("DEPT_HEAD", "ACTOR"):
            if "ScriptNote" in view_name or "Note" in view_name:
                return True
            return False

        # WRITER cannot modify budgets or membership roles
        if role == "WRITER":
            if "Budget" in view_name or "Membership" in view_name:
                return False
            return True

        # OWNER, PRODUCER, DIRECTOR
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        role = get_user_workspace_role(request, obj=obj)
        view_name = view.__class__.__name__

        if role in ("DEPT_HEAD", "ACTOR"):
            if "ScriptNote" in view_name or "Note" in view_name:
                return True
            return False

        if role == "WRITER":
            if "Budget" in view_name or "Membership" in view_name:
                return False

        return True


class CanModifyNode(permissions.BasePermission):
    """
    Protects locked nodes against unauthorized modifications.
    - If node.is_locked is True:
      - Any mutation (title, content, properties, type, parent, delete) requires OWNER, PRODUCER, or DIRECTOR.
      - Returns HTTP 403 Forbidden with {"detail": "Node is locked against revisions."}.
    """

    PROTECTED_FIELDS = {"title", "content", "properties", "type", "parent"}

    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        is_locked = getattr(obj, "is_locked", False)
        if not is_locked:
            # If changing is_locked from False -> True
            if "is_locked" in request.data:
                role = get_user_workspace_role(request, obj=obj)
                if not RolePermissionPolicy.can_lock_scenes(role):
                    raise exceptions.PermissionDenied("Only directors and studio owners can modify lock state.")
            return True

        # Node is locked!
        role = get_user_workspace_role(request, obj=obj)
        can_override_lock = RolePermissionPolicy.can_lock_scenes(role)

        if not can_override_lock:
            # Reject DELETE on locked node
            if request.method == "DELETE":
                raise exceptions.PermissionDenied("Node is locked against revisions.")

            # Reject PATCH/PUT modifying protected fields or lock state
            req_fields = set(request.data.keys())
            if (req_fields & self.PROTECTED_FIELDS) or ("is_locked" in req_fields):
                raise exceptions.PermissionDenied("Node is locked against revisions.")

        return True


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access for safe HTTP methods.
    Enforces authentication for state mutations in production,
    allowing debug headers strictly when DEBUG=True.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user and request.user.is_authenticated:
            return True
        if getattr(settings, "DEBUG", False):
            role = get_user_workspace_role(request)
            return role not in ("ACTOR", "DEPT_HEAD")
        return False
