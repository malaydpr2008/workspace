from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from core.models import (
    Workspace,
    WorkspaceNode,
    Character,
    Shot,
    ShotBlockCoverage,
    BreakdownElement,
)
from core.serializers import (
    WorkspaceSerializer,
    WorkspaceNodeSerializer,
    CharacterSerializer,
    ShotSerializer,
    ShotBlockCoverageSerializer,
    BreakdownElementSerializer,
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

    @action(detail=True, methods=["get"])
    def subtree(self, request, pk=None):
        instance = self.get_object()
        sql = """
        WITH RECURSIVE node_tree AS (
            SELECT * FROM core_workspacenode WHERE id = %s
            UNION ALL
            SELECT c.* FROM core_workspacenode c
            INNER JOIN node_tree p ON c.parent_id = p.id
        )
        SELECT * FROM node_tree ORDER BY rank;
        """
        nodes = list(WorkspaceNode.objects.raw(sql, [str(instance.id)]))
        serializer = self.get_serializer(nodes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        workspace_id = request.query_params.get("workspace_id")

        if not query:
            return Response([])

        queryset = self.get_queryset()
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)

        try:
            from django.contrib.postgres.search import SearchVector, SearchQuery
            vector = SearchVector("title", weight="A") + SearchVector("content", weight="B")
            search_query = SearchQuery(query)
            results = queryset.annotate(search=vector).filter(search=search_query)
            if not results.exists():
                results = queryset.filter(Q(title__icontains=query) | Q(content__icontains=query))
        except Exception:
            results = queryset.filter(Q(title__icontains=query) | Q(content__icontains=query))

        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)


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

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_image(self, request, pk=None):
        shot = self.get_object()
        file_obj = request.FILES.get("file") or request.FILES.get("image")
        if not file_obj:
            return Response(
                {"error": "No file uploaded"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shot.storyboard_file = file_obj
        shot.save()

        if shot.storyboard_file:
            file_url = request.build_absolute_uri(shot.storyboard_file.url)
            shot.storyboard_url = file_url
            shot.save(update_fields=["storyboard_url"])

        serializer = self.get_serializer(shot)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShotBlockCoverageViewSet(viewsets.ModelViewSet):
    queryset = ShotBlockCoverage.objects.all()
    serializer_class = ShotBlockCoverageSerializer


class BreakdownElementViewSet(viewsets.ModelViewSet):
    queryset = BreakdownElement.objects.all().prefetch_related("blocks")
    serializer_class = BreakdownElementSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace_id")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category.upper())
        return queryset

