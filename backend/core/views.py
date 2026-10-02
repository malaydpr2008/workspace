from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.db import transaction
from core.models import (
    Workspace,
    WorkspaceNode,
    Character,
    Shot,
    ShotBlockCoverage,
    BreakdownElement,
    DocumentSnapshot,
    ShootingSchedule,
    ShootingDay,
    StripboardItem,
)
from core.serializers import (
    WorkspaceSerializer,
    WorkspaceNodeSerializer,
    CharacterSerializer,
    ShotSerializer,
    ShotBlockCoverageSerializer,
    BreakdownElementSerializer,
    DocumentSnapshotSerializer,
    ShootingScheduleSerializer,
    ShootingDaySerializer,
    StripboardItemSerializer,
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


class DocumentSnapshotViewSet(viewsets.ModelViewSet):
    queryset = DocumentSnapshot.objects.all().order_by("-created_at")
    serializer_class = DocumentSnapshotSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        document_node = self.request.query_params.get("document_node")
        if document_node:
            queryset = queryset.filter(document_node_id=document_node)
        workspace_id = self.request.query_params.get("workspace_id")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        snapshot = self.get_object()
        doc = snapshot.document_node
        data = snapshot.snapshot_data

        nodes_list = data if isinstance(data, list) else data.get("nodes", [])
        if not nodes_list:
            return Response(
                {"error": "No nodes found in snapshot data to restore"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Get all current descendants of doc using CTE query
            sql = """
            WITH RECURSIVE node_tree AS (
                SELECT id, parent_id FROM core_workspacenode WHERE id = %s
                UNION ALL
                SELECT c.id, c.parent_id FROM core_workspacenode c
                INNER JOIN node_tree p ON c.parent_id = p.id
            )
            SELECT id FROM node_tree WHERE id != %s;
            """
            descendants = list(WorkspaceNode.objects.raw(sql, [str(doc.id), str(doc.id)]))
            descendant_ids = [d.id for d in descendants]
            if descendant_ids:
                WorkspaceNode.objects.filter(id__in=descendant_ids).delete()

            # Restore doc attributes if in snapshot
            doc_data = next((n for n in nodes_list if str(n.get("id")) == str(doc.id)), None)
            if doc_data:
                doc.title = doc_data.get("title", doc.title)
                doc.properties = doc_data.get("properties", doc.properties)
            doc.revision_color = snapshot.revision_color
            doc.save()

            # Recreate or restore all child nodes
            restored_count = 0
            child_nodes = [n for n in nodes_list if str(n.get("id")) != str(doc.id)]

            for item in child_nodes:
                parent_id = item.get("parent") or item.get("parent_id") or str(doc.id)
                WorkspaceNode.objects.create(
                    id=item.get("id"),
                    workspace=doc.workspace,
                    parent_id=parent_id,
                    type=item.get("type", "action"),
                    rank=item.get("rank", "0|h:"),
                    title=item.get("title", ""),
                    content=item.get("content", ""),
                    properties=item.get("properties", {}),
                    revision_color=item.get("revision_color", snapshot.revision_color),
                    is_locked=item.get("is_locked", False),
                    revision_asterisk=item.get("revision_asterisk", False),
                )
                restored_count += 1

        return Response(
            {
                "status": "success",
                "message": f"Restored snapshot '{snapshot.label}' ({snapshot.revision_color})",
                "nodes_restored": restored_count,
            },
            status=status.HTTP_200_OK,
        )


class ShootingScheduleViewSet(viewsets.ModelViewSet):
    queryset = ShootingSchedule.objects.all()
    serializer_class = ShootingScheduleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        screenplay_id = self.request.query_params.get("screenplay")
        if screenplay_id:
            queryset = queryset.filter(screenplay_id=screenplay_id)
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset


class ShootingDayViewSet(viewsets.ModelViewSet):
    queryset = ShootingDay.objects.all()
    serializer_class = ShootingDaySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        schedule_id = self.request.query_params.get("schedule")
        if schedule_id:
            queryset = queryset.filter(schedule_id=schedule_id)
        return queryset


class StripboardItemViewSet(viewsets.ModelViewSet):
    queryset = StripboardItem.objects.all()
    serializer_class = StripboardItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        schedule_id = self.request.query_params.get("schedule")
        if schedule_id:
            queryset = queryset.filter(schedule_id=schedule_id)

        shooting_day_id = self.request.query_params.get("shooting_day")
        if shooting_day_id:
            if shooting_day_id.lower() in ("null", "none", "unscheduled"):
                queryset = queryset.filter(shooting_day__isnull=True)
            else:
                queryset = queryset.filter(shooting_day_id=shooting_day_id)

        return queryset

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """
        Batch update order and shooting_day for strips.
        Payload: [ { id: <uuid>, order: <int>, shooting_day: <uuid|null> }, ... ]
        """
        items = request.data
        if not isinstance(items, list):
            return Response(
                {"error": "Expected a list of strip items with id, order, and optional shooting_day"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for item in items:
                strip_id = item.get("id")
                if not strip_id:
                    continue
                update_fields = {}
                if "order" in item:
                    update_fields["order"] = item["order"]
                if "shooting_day" in item:
                    update_fields["shooting_day_id"] = item["shooting_day"]
                if update_fields:
                    StripboardItem.objects.filter(id=strip_id).update(**update_fields)

        return Response({"status": "reordered"}, status=status.HTTP_200_OK)


