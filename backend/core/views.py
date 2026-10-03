from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.db import transaction
from datetime import date, timedelta
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
    ScriptNote,
    ProductionTake,
    ADRCue,
    AudioSpottingCue,
    ProductionBudget,
    BudgetCategory,
    BudgetLineItem,
    ProductionMilestone,
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
    ScriptNoteSerializer,
    ProductionTakeSerializer,
    ADRCueSerializer,
    AudioSpottingCueSerializer,
    ProductionBudgetSerializer,
    BudgetCategorySerializer,
    BudgetLineItemSerializer,
    ProductionMilestoneSerializer,
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


class ScriptNoteViewSet(viewsets.ModelViewSet):
    queryset = ScriptNote.objects.all()
    serializer_class = ScriptNoteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        node_id = self.request.query_params.get("node")
        if node_id:
            queryset = queryset.filter(node_id=node_id)

        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        is_resolved = self.request.query_params.get("is_resolved")
        if is_resolved is not None:
            if is_resolved.lower() in ("true", "1"):
                queryset = queryset.filter(is_resolved=True)
            elif is_resolved.lower() in ("false", "0"):
                queryset = queryset.filter(is_resolved=False)

        top_level = self.request.query_params.get("top_level")
        if top_level is not None and top_level.lower() in ("true", "1"):
            queryset = queryset.filter(parent_note__isnull=True)

        return queryset

    @action(detail=True, methods=["post"])
    def toggle_resolve(self, request, pk=None):
        note = self.get_object()
        note.is_resolved = not note.is_resolved
        note.save(update_fields=["is_resolved"])
        return Response(ScriptNoteSerializer(note, context={"request": request}).data)


class ProductionTakeViewSet(viewsets.ModelViewSet):
    queryset = ProductionTake.objects.all()
    serializer_class = ProductionTakeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        shot_id = self.request.query_params.get("shot")
        if shot_id:
            queryset = queryset.filter(shot_id=shot_id)
        return queryset

    @action(detail=True, methods=["post"])
    def toggle_circle(self, request, pk=None):
        take = self.get_object()
        take.is_circle_take = not take.is_circle_take
        take.save(update_fields=["is_circle_take"])
        return Response(ProductionTakeSerializer(take, context={"request": request}).data)


class ADRCueViewSet(viewsets.ModelViewSet):
    queryset = ADRCue.objects.all().select_related("character", "dialogue_node", "dialogue_node__parent").order_by("cue_number", "created_at")
    serializer_class = ADRCueSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        character_id = self.request.query_params.get("character")
        if character_id:
            queryset = queryset.filter(character_id=character_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        node_id = self.request.query_params.get("dialogue_node")
        if node_id:
            queryset = queryset.filter(dialogue_node_id=node_id)
        return queryset

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        cue = self.get_object()
        new_status = request.data.get("status")
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
        cue.status = new_status
        cue.save(update_fields=["status"])
        return Response(ADRCueSerializer(cue, context={"request": request}).data)


class AudioSpottingCueViewSet(viewsets.ModelViewSet):
    queryset = AudioSpottingCue.objects.all().select_related("scene").order_by("created_at")
    serializer_class = AudioSpottingCueSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        scene_id = self.request.query_params.get("scene")
        if scene_id:
            queryset = queryset.filter(scene_id=scene_id)
        cue_type = self.request.query_params.get("cue_type")
        if cue_type:
            queryset = queryset.filter(cue_type=cue_type)
        return queryset


class ProductionBudgetViewSet(viewsets.ModelViewSet):
    queryset = ProductionBudget.objects.all().prefetch_related("categories__line_items")
    serializer_class = ProductionBudgetSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        screenplay_id = self.request.query_params.get("screenplay")
        if screenplay_id:
            queryset = queryset.filter(screenplay_id=screenplay_id)
        return queryset

    @action(detail=True, methods=["post"])
    def populate_from_workspace(self, request, pk=None):
        budget = self.get_object()
        workspace = budget.workspace
        screenplay = budget.screenplay

        with transaction.atomic():
            # 1. Category 1000: STORY & RIGHTS (ATL)
            cat_story, _ = BudgetCategory.objects.get_or_create(
                budget=budget,
                code="1000",
                defaults={"name": "STORY & RIGHTS", "tier": "ATL", "order": 1},
            )
            if not cat_story.line_items.exists():
                BudgetLineItem.objects.create(
                    category=cat_story,
                    account_code="1001",
                    description="Screenplay Rights & Intellectual Property",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=50000.00,
                    fringe_percentage=0.0,
                    notes=f"Rights acquisition for '{screenplay.title or 'Master Screenplay'}'",
                )
                BudgetLineItem.objects.create(
                    category=cat_story,
                    account_code="1002",
                    description="Writer Revision Drafts & Polish",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=25000.00,
                    fringe_percentage=0.0,
                    notes="WGA standard revision guarantees",
                )

            # 2. Category 2000: PRODUCERS & DIRECTOR (ATL)
            cat_dir, _ = BudgetCategory.objects.get_or_create(
                budget=budget,
                code="2000",
                defaults={"name": "PRODUCERS & DIRECTOR", "tier": "ATL", "order": 2},
            )
            if not cat_dir.line_items.exists():
                BudgetLineItem.objects.create(
                    category=cat_dir,
                    account_code="2001",
                    description="Director Pre-Production & Principal Photography",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=65000.00,
                    fringe_percentage=10.0,
                    notes="DGA tier 2 agreement",
                )
                BudgetLineItem.objects.create(
                    category=cat_dir,
                    account_code="2002",
                    description="Lead Producers & Line Producer Fee",
                    rate_type="FLAT",
                    quantity=2.0,
                    rate=35000.00,
                    fringe_percentage=10.0,
                    notes="PGA production package",
                )

            # 3. Category 3000: CAST & PRINCIPAL TALENT (ATL)
            cat_cast, _ = BudgetCategory.objects.get_or_create(
                budget=budget,
                code="3000",
                defaults={"name": "CAST & PRINCIPAL TALENT", "tier": "ATL", "order": 3},
            )
            # Find characters in workspace
            characters = Character.objects.filter(workspace=workspace)
            existing_char_ids = set(
                cat_cast.line_items.filter(character__isnull=False).values_list("character_id", flat=True)
            )

            # Estimate shoot days per character from Stripboard or dialogue appearances
            for idx, char in enumerate(characters, start=1):
                if char.id in existing_char_ids:
                    continue

                # Count scene appearances in screenplay
                char_dialogue_count = WorkspaceNode.objects.filter(
                    workspace=workspace,
                    type="dialogue",
                    properties__character_id=str(char.id),
                ).count()

                # Estimated shoot days: min 3, max based on line density
                calc_days = max(3.0, min(float(char_dialogue_count // 3 + 2), 20.0))
                day_rate = 1500.00  # SAG Day Performer Scale

                BudgetLineItem.objects.create(
                    category=cat_cast,
                    account_code=f"30{idx:02d}",
                    description=f"Cast: {char.name}",
                    rate_type="DAILY",
                    quantity=calc_days,
                    rate=day_rate,
                    fringe_percentage=15.0,
                    character=char,
                    notes=f"Scheduled {calc_days:.0f} shooting days ({char_dialogue_count} script dialogue lines)",
                )

            # 4. Category 4000: PRODUCTION CREW & CAMERA (BTL_PRODUCTION)
            cat_crew, _ = BudgetCategory.objects.get_or_create(
                budget=budget,
                code="4000",
                defaults={"name": "PRODUCTION CREW & CAMERA", "tier": "BTL_PRODUCTION", "order": 4},
            )
            # Calculate total shooting schedule days
            total_shoot_days = ShootingDay.objects.filter(schedule__workspace=workspace).count()
            if total_shoot_days == 0:
                total_shoot_days = 12.0
            else:
                total_shoot_days = float(total_shoot_days)

            if not cat_crew.line_items.exists():
                BudgetLineItem.objects.create(
                    category=cat_crew,
                    account_code="4001",
                    description="Director of Photography (DP) & Camera Op",
                    rate_type="DAILY",
                    quantity=total_shoot_days,
                    rate=1850.00,
                    fringe_percentage=15.0,
                    notes=f"Based on {total_shoot_days:.0f} scheduled shooting days",
                )
                BudgetLineItem.objects.create(
                    category=cat_crew,
                    account_code="4002",
                    description="Camera & Lens Package Rental (Arri Alexa / Anamorphic)",
                    rate_type="DAILY",
                    quantity=total_shoot_days,
                    rate=2200.00,
                    fringe_percentage=0.0,
                    notes="A-Camera + B-Camera Prime Set",
                )
                BudgetLineItem.objects.create(
                    category=cat_crew,
                    account_code="4003",
                    description="Gaffer, Key Grip & Electric Package",
                    rate_type="DAILY",
                    quantity=total_shoot_days,
                    rate=2400.00,
                    fringe_percentage=15.0,
                    notes="5-Ton Grip & Lighting Truck Package",
                )
                BudgetLineItem.objects.create(
                    category=cat_crew,
                    account_code="4004",
                    description="Production Sound Mixer & Boom Operator",
                    rate_type="DAILY",
                    quantity=total_shoot_days,
                    rate=1450.00,
                    fringe_percentage=15.0,
                    notes="Sound cart + wireless lavalier package",
                )

            # 5. Category 5000: ART, PROPS & WARDROBE (BTL_PRODUCTION)
            cat_art, _ = BudgetCategory.objects.get_or_create(
                budget=budget,
                code="5000",
                defaults={"name": "ART, PROPS & WARDROBE", "tier": "BTL_PRODUCTION", "order": 5},
            )
            breakdown_elements = BreakdownElement.objects.filter(workspace=workspace)
            existing_elem_ids = set(
                cat_art.line_items.filter(breakdown_element__isnull=False).values_list("breakdown_element_id", flat=True)
            )

            if breakdown_elements.exists():
                for idx, elem in enumerate(breakdown_elements, start=1):
                    if elem.id in existing_elem_ids:
                        continue
                    unit_cost = 250.00
                    if elem.category in ["VFX", "VEHICLE"]:
                        unit_cost = 850.00
                    elif elem.category in ["COSTUME", "PROP"]:
                        unit_cost = 350.00
                    elif elem.category == "LOCATION":
                        unit_cost = 1500.00

                    BudgetLineItem.objects.create(
                        category=cat_art,
                        account_code=f"5{idx:03d}",
                        description=f"[{elem.category}] {elem.name}",
                        rate_type="PER_UNIT",
                        quantity=1.0,
                        rate=unit_cost,
                        fringe_percentage=0.0,
                        breakdown_element=elem,
                        notes=f"Tagged in {elem.blocks.count()} script blocks",
                    )
            elif not cat_art.line_items.exists():
                BudgetLineItem.objects.create(
                    category=cat_art,
                    account_code="5001",
                    description="Production Design & Set Construction Kit",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=15000.00,
                    fringe_percentage=0.0,
                    notes="Practical interior set dressings",
                )
                BudgetLineItem.objects.create(
                    category=cat_art,
                    account_code="5002",
                    description="Props & Practical Specialty Rigging",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=6500.00,
                    fringe_percentage=0.0,
                    notes="Hero prop builds and fabrication",
                )

            # 6. Category 6000: POST SOUND & ADR (BTL_POST)
            cat_sound, _ = BudgetCategory.objects.get_or_create(
                budget=budget,
                code="6000",
                defaults={"name": "POST SOUND & ADR", "tier": "BTL_POST", "order": 6},
            )
            if not cat_sound.line_items.exists():
                adr_cues_count = ADRCue.objects.filter(workspace=workspace).count()
                adr_hours = max(float(adr_cues_count * 0.5), 6.0)

                BudgetLineItem.objects.create(
                    category=cat_sound,
                    account_code="6001",
                    description="ADR Studio Recording Stage & Sound Engineer",
                    rate_type="HOURLY",
                    quantity=adr_hours,
                    rate=350.00,
                    fringe_percentage=0.0,
                    notes=f"Allocated for {adr_cues_count} registered ADR script cue(s)",
                )
                BudgetLineItem.objects.create(
                    category=cat_sound,
                    account_code="6002",
                    description="Original Score Composition & Orchestral Recording",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=20000.00,
                    fringe_percentage=0.0,
                    notes="Feature film original dramatic score",
                )
                BudgetLineItem.objects.create(
                    category=cat_sound,
                    account_code="6003",
                    description="Foley Recording & Dolby Atmos Re-recording Mix",
                    rate_type="FLAT",
                    quantity=1.0,
                    rate=12000.00,
                    fringe_percentage=0.0,
                    notes="Final 7.1.4 and 5.1 theatrical print masters",
                )

        fresh_budget = ProductionBudget.objects.prefetch_related("categories__line_items").get(id=budget.id)
        serializer = self.get_serializer(fresh_budget)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all().prefetch_related("line_items")
    serializer_class = BudgetCategorySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        budget_id = self.request.query_params.get("budget")
        if budget_id:
            queryset = queryset.filter(budget_id=budget_id)
        tier = self.request.query_params.get("tier")
        if tier:
            queryset = queryset.filter(tier=tier)
        return queryset


class BudgetLineItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetLineItem.objects.all()
    serializer_class = BudgetLineItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        budget_id = self.request.query_params.get("budget")
        if budget_id:
            queryset = queryset.filter(category__budget_id=budget_id)
        return queryset


class ProductionMilestoneViewSet(viewsets.ModelViewSet):
    queryset = ProductionMilestone.objects.all()
    serializer_class = ProductionMilestoneSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        screenplay_id = self.request.query_params.get("screenplay")
        if screenplay_id:
            queryset = queryset.filter(screenplay_id=screenplay_id)
        phase = self.request.query_params.get("phase")
        if phase:
            queryset = queryset.filter(phase=phase)
        return queryset

    @action(detail=False, methods=["post"])
    def initialize_default_timeline(self, request):
        screenplay_id = request.data.get("screenplay")
        if not screenplay_id:
            return Response({"error": "screenplay is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            screenplay = WorkspaceNode.objects.get(id=screenplay_id)
        except WorkspaceNode.DoesNotExist:
            return Response({"error": "Screenplay node not found"}, status=status.HTTP_404_NOT_FOUND)

        workspace = screenplay.workspace
        today = date.today()

        standard_milestones = [
            {
                "phase": "DEVELOPMENT",
                "title": "Screenplay Draft Lock & Legal Clearance",
                "start_date": today - timedelta(days=21),
                "end_date": today - timedelta(days=2),
                "status": "COMPLETED",
                "progress_percentage": 100,
                "department": "EXECUTIVE",
                "order": 1,
            },
            {
                "phase": "PRE_PRODUCTION",
                "title": "Location Scouting & Art Department Build",
                "start_date": today - timedelta(days=5),
                "end_date": today + timedelta(days=15),
                "status": "IN_PROGRESS",
                "progress_percentage": 75,
                "department": "ART",
                "order": 2,
            },
            {
                "phase": "PRE_PRODUCTION",
                "title": "Cast Table Read & Department Walkthrough",
                "start_date": today + timedelta(days=10),
                "end_date": today + timedelta(days=18),
                "status": "IN_PROGRESS",
                "progress_percentage": 50,
                "department": "TALENT",
                "order": 3,
            },
            {
                "phase": "PRODUCTION",
                "title": "Principal Photography (Shooting Schedule)",
                "start_date": today + timedelta(days=20),
                "end_date": today + timedelta(days=50),
                "status": "IN_PROGRESS",
                "progress_percentage": 25,
                "department": "CAMERA",
                "order": 4,
            },
            {
                "phase": "POST_PRODUCTION",
                "title": "Picture Editorial Assembly & Director's Cut",
                "start_date": today + timedelta(days=40),
                "end_date": today + timedelta(days=75),
                "status": "PLANNED",
                "progress_percentage": 0,
                "department": "EDITORIAL",
                "order": 5,
            },
            {
                "phase": "POST_PRODUCTION",
                "title": "ADR Loop Recording & Foley Sound Design",
                "start_date": today + timedelta(days=70),
                "end_date": today + timedelta(days=95),
                "status": "PLANNED",
                "progress_percentage": 0,
                "department": "SOUND",
                "order": 6,
            },
            {
                "phase": "POST_PRODUCTION",
                "title": "Original Dramatic Score Recording & Mix",
                "start_date": today + timedelta(days=80),
                "end_date": today + timedelta(days=100),
                "status": "PLANNED",
                "progress_percentage": 0,
                "department": "SOUND",
                "order": 7,
            },
            {
                "phase": "DELIVERY",
                "title": "Dolby Vision Color Grade & Master DCP Delivery",
                "start_date": today + timedelta(days=100),
                "end_date": today + timedelta(days=120),
                "status": "PLANNED",
                "progress_percentage": 0,
                "department": "EXECUTIVE",
                "order": 8,
            },
        ]

        with transaction.atomic():
            ProductionMilestone.objects.filter(screenplay=screenplay).delete()

            created_milestones = []
            for item in standard_milestones:
                m = ProductionMilestone.objects.create(
                    workspace=workspace,
                    screenplay=screenplay,
                    phase=item["phase"],
                    title=item["title"],
                    start_date=item["start_date"],
                    end_date=item["end_date"],
                    status=item["status"],
                    progress_percentage=item["progress_percentage"],
                    department=item["department"],
                    order=item["order"],
                )
                created_milestones.append(m)

        serializer = self.get_serializer(created_milestones, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)




