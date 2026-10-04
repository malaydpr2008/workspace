from rest_framework import permissions


class IsSoloCreator(permissions.BasePermission):
    """
    Permissive solo studio access across all endpoints.
    Unrestricted read/write across all studio endpoints.
    """

    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        return True


# Backward-compatible aliases for legacy imports
IsSoloCreatorOrReadOnly = IsSoloCreator
HasWorkspaceRole = IsSoloCreator
CanModifyNode = IsSoloCreator
IsAuthenticatedOrReadOnly = IsSoloCreator
