from rest_framework import permissions


class IsSoloCreator(permissions.BasePermission):
    """
    Permissive solo-developer access. Unrestricted read/write across all studio endpoints.
    """

    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        return True


# Backward-compatible aliases and permissive helpers for solo developer mode:
class IsSoloCreatorOrReadOnly(IsSoloCreator):
    pass


class HasWorkspaceRole(IsSoloCreator):
    pass


class CanModifyNode(IsSoloCreator):
    pass


class IsAuthenticatedOrReadOnly(IsSoloCreator):
    pass


def get_user_workspace_role(request=None, workspace_id=None, obj=None) -> str:
    """In solo developer mode, all callers have unrestricted OWNER authority."""
    return "OWNER"


class RolePermissionPolicy:
    """
    Solo Creator Studio permission policy.
    In solo creator mode, all capabilities are unconditionally enabled.
    """

    @classmethod
    def can_edit_script(cls, role: str = None) -> bool:
        return True

    @classmethod
    def can_edit_budget(cls, role: str = None) -> bool:
        return True

    @classmethod
    def can_lock_scenes(cls, role: str = None) -> bool:
        return True

    @classmethod
    def can_manage_members(cls, role: str = None) -> bool:
        return True

    @classmethod
    def get_capabilities(cls, role: str = None) -> dict:
        return {
            "can_edit_script": True,
            "can_edit_budget": True,
            "can_lock_scenes": True,
            "can_manage_members": True,
        }
