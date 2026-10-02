from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    WorkspaceViewSet,
    WorkspaceNodeViewSet,
    CharacterViewSet,
    ShotViewSet,
    ShotBlockCoverageViewSet,
)

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")
router.register(r"nodes", WorkspaceNodeViewSet, basename="workspacenode")
router.register(r"characters", CharacterViewSet, basename="character")
router.register(r"shots", ShotViewSet, basename="shot")
router.register(r"shot-coverages", ShotBlockCoverageViewSet, basename="shotblockcoverage")

urlpatterns = [
    path("", include(router.urls)),
]
