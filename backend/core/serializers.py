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

