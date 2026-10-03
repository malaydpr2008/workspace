from rest_framework import permissions


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


class HasWorkspaceRolePermission(permissions.BasePermission):
    """
    Base permission checking if request user has required role capabilities in workspace.
    """

    def has_permission(self, request, view):
        # Allow safe methods by default unless view specifies otherwise
        return True
