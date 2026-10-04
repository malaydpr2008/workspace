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
    ShootingScheduleViewSet,
    ShootingDayViewSet,
    StripboardItemViewSet,
    ScriptNoteViewSet,
    ProductionTakeViewSet,
    ADRCueViewSet,
    AudioSpottingCueViewSet,
    ProductionBudgetViewSet,
    BudgetCategoryViewSet,
    BudgetLineItemViewSet,
    ProductionMilestoneViewSet,
    StudioActivityLogViewSet,
    ScriptCoverageReportViewSet,
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
router.register(r"schedules", ShootingScheduleViewSet, basename="shootingschedule")
router.register(r"shooting-days", ShootingDayViewSet, basename="shootingday")
router.register(r"stripboard-items", StripboardItemViewSet, basename="stripboarditem")
router.register(r"notes", ScriptNoteViewSet, basename="scriptnote")
router.register(r"script-notes", ScriptNoteViewSet, basename="scriptnotes")
router.register(r"takes", ProductionTakeViewSet, basename="productiontake")
router.register(r"production-takes", ProductionTakeViewSet, basename="productiontakes")
router.register(r"adr-cues", ADRCueViewSet, basename="adrcue")
router.register(r"audio-cues", AudioSpottingCueViewSet, basename="audiospottingcue")
router.register(r"audio-spotting-cues", AudioSpottingCueViewSet, basename="audiospottingcues")
router.register(r"budgets", ProductionBudgetViewSet, basename="productionbudget")
router.register(r"budget-categories", BudgetCategoryViewSet, basename="budgetcategory")
router.register(r"budget-line-items", BudgetLineItemViewSet, basename="budgetlineitem")
router.register(r"milestones", ProductionMilestoneViewSet, basename="productionmilestone")
router.register(r"activity-logs", StudioActivityLogViewSet, basename="studioactivitylog")
router.register(r"coverage-reports", ScriptCoverageReportViewSet, basename="scriptcoveragereport")


urlpatterns = [
    path("", include(router.urls)),
]
