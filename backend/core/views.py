from rest_framework import viewsets
from core.models import Workspace, WorkspaceNode, Character, Shot, ShotBlockCoverage
from core.serializers import (
    WorkspaceSerializer,
    WorkspaceNodeSerializer,
    CharacterSerializer,
    ShotSerializer,
    ShotBlockCoverageSerializer,
)


class WorkspaceViewSet(viewsets.ModelViewSet):
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceSerializer


class WorkspaceNodeViewSet(viewsets.ModelViewSet):
    queryset = WorkspaceNode.objects.all()
    serializer_class = WorkspaceNodeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace_id")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)

        parent_id = self.request.query_params.get("parent_id")
        if parent_id is not None:
            if parent_id.lower() in ("null", "none", ""):
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)

        node_type = self.request.query_params.get("type")
        if node_type:
            queryset = queryset.filter(type=node_type)

        return queryset


class CharacterViewSet(viewsets.ModelViewSet):
    queryset = Character.objects.all()
    serializer_class = CharacterSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace_id")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset


class ShotViewSet(viewsets.ModelViewSet):
    queryset = Shot.objects.all().prefetch_related("blocks")
    serializer_class = ShotSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        scene_id = self.request.query_params.get("scene_id")
        if scene_id:
            queryset = queryset.filter(scene_id=scene_id)
        return queryset


class ShotBlockCoverageViewSet(viewsets.ModelViewSet):
    queryset = ShotBlockCoverage.objects.all()
    serializer_class = ShotBlockCoverageSerializer
