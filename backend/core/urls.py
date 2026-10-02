from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    WorkspaceViewSet,
    WorkspaceNodeViewSet,
    CharacterViewSet,
    ShotViewSet,
    ShotBlockCoverageViewSet,
    BreakdownElementViewSet,
    DocumentSnapshotViewSet,
)

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")
router.register(r"nodes", WorkspaceNodeViewSet, basename="workspacenode")
router.register(r"characters", CharacterViewSet, basename="character")
router.register(r"shots", ShotViewSet, basename="shot")
router.register(r"shot-coverages", ShotBlockCoverageViewSet, basename="shotblockcoverage")
router.register(r"shot-coverage", ShotBlockCoverageViewSet, basename="shotcoverage")
router.register(r"breakdown-elements", BreakdownElementViewSet, basename="breakdownelement")
router.register(r"snapshots", DocumentSnapshotViewSet, basename="documentsnapshot")

urlpatterns = [
    path("", include(router.urls)),
]
