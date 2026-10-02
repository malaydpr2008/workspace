from rest_framework import serializers
from core.models import Workspace, WorkspaceNode, Character, Shot, ShotBlockCoverage, BreakdownElement


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

