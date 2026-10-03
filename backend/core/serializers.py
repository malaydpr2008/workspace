from rest_framework import serializers
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


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = "__all__"


class WorkspaceNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceNode
        fields = "__all__"


class CharacterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Character
        fields = "__all__"


class ShotBlockCoverageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShotBlockCoverage
        fields = "__all__"


class ShotSerializer(serializers.ModelSerializer):
    blocks = WorkspaceNodeSerializer(many=True, read_only=True)

    class Meta:
        model = Shot
        fields = [
            "id",
            "scene",
            "shot_number",
            "shot_type",
            "lens",
            "storyboard_url",
            "storyboard_file",
            "duration_seconds",
            "blocks",
        ]


class BreakdownElementSerializer(serializers.ModelSerializer):
    block_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=WorkspaceNode.objects.all(),
        source="blocks",
        required=False,
    )
    blocks = WorkspaceNodeSerializer(many=True, read_only=True)

    class Meta:
        model = BreakdownElement
        fields = [
            "id",
            "workspace",
            "category",
            "name",
            "notes",
            "block_ids",
            "blocks",
            "created_at",
            "updated_at",
        ]


class DocumentSnapshotSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(), required=False
    )

    class Meta:
        model = DocumentSnapshot
        fields = [
            "id",
            "workspace",
            "document_node",
            "label",
            "revision_color",
            "snapshot_data",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if "workspace" not in attrs and "document_node" in attrs:
            attrs["workspace"] = attrs["document_node"].workspace
        return attrs


class StripboardItemSerializer(serializers.ModelSerializer):
    scene_details = WorkspaceNodeSerializer(source="scene", read_only=True)

    class Meta:
        model = StripboardItem
        fields = [
            "id",
            "schedule",
            "shooting_day",
            "scene",
            "scene_details",
            "is_banner",
            "banner_title",
            "order",
        ]
        read_only_fields = ["id"]


class ShootingDaySerializer(serializers.ModelSerializer):
    strips = StripboardItemSerializer(many=True, read_only=True)

    class Meta:
        model = ShootingDay
        fields = [
            "id",
            "schedule",
            "day_number",
            "date",
            "call_time",
            "shooting_location",
            "notes",
            "order",
            "strips",
        ]
        read_only_fields = ["id"]


class ShootingScheduleSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(), required=False
    )
    days_count = serializers.IntegerField(source="days.count", read_only=True)

    class Meta:
        model = ShootingSchedule
        fields = [
            "id",
            "workspace",
            "screenplay",
            "title",
            "days_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if "workspace" not in attrs and "screenplay" in attrs:
            attrs["workspace"] = attrs["screenplay"].workspace
        return attrs


class ScriptNoteSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(), required=False
    )
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ScriptNote
        fields = [
            "id",
            "workspace",
            "node",
            "author_name",
            "author_role",
            "category",
            "text",
            "is_resolved",
            "parent_note",
            "replies",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_replies(self, obj):
        if obj.parent_note_id is None:
            replies = obj.replies.all().order_by("created_at")
            return ScriptNoteSerializer(replies, many=True, context=self.context).data
        return []

    def validate(self, attrs):
        if "workspace" not in attrs and "node" in attrs:
            attrs["workspace"] = attrs["node"].workspace
        elif "workspace" not in attrs and "parent_note" in attrs and attrs["parent_note"]:
            attrs["workspace"] = attrs["parent_note"].workspace
            if "node" not in attrs:
                attrs["node"] = attrs["parent_note"].node
        return attrs


class ProductionTakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionTake
        fields = [
            "id",
            "shot",
            "take_number",
            "is_circle_take",
            "status",
            "camera_roll",
            "sound_roll",
            "duration_seconds",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ADRCueSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(), required=False
    )
    character_name = serializers.CharField(source="character.name", read_only=True)
    dialogue_content = serializers.CharField(source="dialogue_node.content", read_only=True)
    scene_id = serializers.SerializerMethodField()
    scene_title = serializers.SerializerMethodField()

    class Meta:
        model = ADRCue
        fields = [
            "id",
            "workspace",
            "dialogue_node",
            "character",
            "character_name",
            "dialogue_content",
            "scene_id",
            "scene_title",
            "cue_number",
            "reason",
            "priority",
            "status",
            "timecode_in",
            "timecode_out",
            "actor_notes",
            "audio_file",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_scene_id(self, obj):
        if obj.dialogue_node and obj.dialogue_node.parent:
            return str(obj.dialogue_node.parent_id)
        return None

    def get_scene_title(self, obj):
        if obj.dialogue_node and obj.dialogue_node.parent:
            return obj.dialogue_node.parent.title
        return None

    def validate(self, attrs):
        if "workspace" not in attrs:
            if "dialogue_node" in attrs:
                attrs["workspace"] = attrs["dialogue_node"].workspace
            elif "character" in attrs:
                attrs["workspace"] = attrs["character"].workspace
        return attrs


class AudioSpottingCueSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(
        queryset=Workspace.objects.all(), required=False
    )
    scene_title = serializers.CharField(source="scene.title", read_only=True)

    class Meta:
        model = AudioSpottingCue
        fields = [
            "id",
            "workspace",
            "scene",
            "scene_title",
            "cue_type",
            "cue_name",
            "timecode_in",
            "timecode_out",
            "notes",
            "intensity",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if "workspace" not in attrs and "scene" in attrs:
            attrs["workspace"] = attrs["scene"].workspace
        return attrs


class BudgetLineItemSerializer(serializers.ModelSerializer):
    character_name = serializers.CharField(source="character.name", read_only=True)
    breakdown_element_name = serializers.CharField(source="breakdown_element.name", read_only=True)
    estimated_total = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()

    class Meta:
        model = BudgetLineItem
        fields = [
            "id",
            "category",
            "account_code",
            "description",
            "rate_type",
            "quantity",
            "rate",
            "fringe_percentage",
            "actual_cost",
            "estimated_total",
            "variance",
            "notes",
            "character",
            "character_name",
            "breakdown_element",
            "breakdown_element_name",
        ]
        read_only_fields = ["id", "estimated_total", "variance", "character_name", "breakdown_element_name"]

    def get_estimated_total(self, obj):
        try:
            base = float(obj.quantity or 0) * float(obj.rate or 0)
            fringe = base * (float(obj.fringe_percentage or 0) / 100.0)
            return round(base + fringe, 2)
        except (ValueError, TypeError):
            return 0.00

    def get_variance(self, obj):
        try:
            est = self.get_estimated_total(obj)
            act = float(obj.actual_cost or 0)
            return round(est - act, 2)
        except (ValueError, TypeError):
            return 0.00


class BudgetCategorySerializer(serializers.ModelSerializer):
    line_items = BudgetLineItemSerializer(many=True, read_only=True)
    subtotal_estimated = serializers.SerializerMethodField()
    subtotal_actual = serializers.SerializerMethodField()
    subtotal_variance = serializers.SerializerMethodField()

    class Meta:
        model = BudgetCategory
        fields = [
            "id",
            "budget",
            "code",
            "name",
            "tier",
            "order",
            "line_items",
            "subtotal_estimated",
            "subtotal_actual",
            "subtotal_variance",
        ]
        read_only_fields = ["id", "line_items", "subtotal_estimated", "subtotal_actual", "subtotal_variance"]

    def get_subtotal_estimated(self, obj):
        total = 0.0
        for item in obj.line_items.all():
            base = float(item.quantity or 0) * float(item.rate or 0)
            fringe = base * (float(item.fringe_percentage or 0) / 100.0)
            total += base + fringe
        return round(total, 2)

    def get_subtotal_actual(self, obj):
        total = sum(float(item.actual_cost or 0) for item in obj.line_items.all())
        return round(total, 2)

    def get_subtotal_variance(self, obj):
        return round(self.get_subtotal_estimated(obj) - self.get_subtotal_actual(obj), 2)


class ProductionBudgetSerializer(serializers.ModelSerializer):
    categories = BudgetCategorySerializer(many=True, read_only=True)
    screenplay_title = serializers.CharField(source="screenplay.title", read_only=True)
    atl_subtotal = serializers.SerializerMethodField()
    btl_production_subtotal = serializers.SerializerMethodField()
    btl_post_subtotal = serializers.SerializerMethodField()
    other_subtotal = serializers.SerializerMethodField()
    subtotal_before_contingency = serializers.SerializerMethodField()
    contingency_amount = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()
    actual_total = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()

    class Meta:
        model = ProductionBudget
        fields = [
            "id",
            "workspace",
            "screenplay",
            "screenplay_title",
            "title",
            "currency",
            "contingency_percentage",
            "categories",
            "atl_subtotal",
            "btl_production_subtotal",
            "btl_post_subtotal",
            "other_subtotal",
            "subtotal_before_contingency",
            "contingency_amount",
            "grand_total",
            "actual_total",
            "variance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "categories",
            "screenplay_title",
            "atl_subtotal",
            "btl_production_subtotal",
            "btl_post_subtotal",
            "other_subtotal",
            "subtotal_before_contingency",
            "contingency_amount",
            "grand_total",
            "actual_total",
            "variance",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        if "workspace" not in attrs and "screenplay" in attrs:
            attrs["workspace"] = attrs["screenplay"].workspace
        return attrs

    def _get_tier_totals(self, obj):
        totals = {"ATL": 0.0, "BTL_PRODUCTION": 0.0, "BTL_POST": 0.0, "OTHER": 0.0, "ACTUAL": 0.0}
        for cat in obj.categories.all():
            cat_est = 0.0
            for item in cat.line_items.all():
                base = float(item.quantity or 0) * float(item.rate or 0)
                fringe = base * (float(item.fringe_percentage or 0) / 100.0)
                cat_est += base + fringe
                totals["ACTUAL"] += float(item.actual_cost or 0)
            if cat.tier in totals:
                totals[cat.tier] += cat_est
            else:
                totals["OTHER"] += cat_est
        return totals

    def get_atl_subtotal(self, obj):
        return round(self._get_tier_totals(obj)["ATL"], 2)

    def get_btl_production_subtotal(self, obj):
        return round(self._get_tier_totals(obj)["BTL_PRODUCTION"], 2)

    def get_btl_post_subtotal(self, obj):
        return round(self._get_tier_totals(obj)["BTL_POST"], 2)

    def get_other_subtotal(self, obj):
        return round(self._get_tier_totals(obj)["OTHER"], 2)

    def get_subtotal_before_contingency(self, obj):
        t = self._get_tier_totals(obj)
        sub = t["ATL"] + t["BTL_PRODUCTION"] + t["BTL_POST"] + t["OTHER"]
        return round(sub, 2)

    def get_contingency_amount(self, obj):
        sub = self.get_subtotal_before_contingency(obj)
        return round(sub * (float(obj.contingency_percentage or 0) / 100.0), 2)

    def get_grand_total(self, obj):
        sub = self.get_subtotal_before_contingency(obj)
        cont = self.get_contingency_amount(obj)
        return round(sub + cont, 2)

    def get_actual_total(self, obj):
        return round(self._get_tier_totals(obj)["ACTUAL"], 2)

    def get_variance(self, obj):
        return round(self.get_grand_total(obj) - self.get_actual_total(obj), 2)


class ProductionMilestoneSerializer(serializers.ModelSerializer):
    screenplay_title = serializers.CharField(source="screenplay.title", read_only=True)

    class Meta:
        model = ProductionMilestone
        fields = [
            "id",
            "workspace",
            "screenplay",
            "screenplay_title",
            "phase",
            "title",
            "start_date",
            "end_date",
            "status",
            "progress_percentage",
            "department",
            "order",
            "created_at",
        ]
        read_only_fields = ["id", "screenplay_title", "created_at"]

    def validate(self, attrs):
        if "workspace" not in attrs and "screenplay" in attrs:
            attrs["workspace"] = attrs["screenplay"].workspace
        return attrs



