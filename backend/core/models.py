import uuid
from django.db import models
from django.contrib.postgres.indexes import GinIndex

# In Django, models.JSONField natively maps to JSONB in PostgreSQL.
# Alias to satisfy models.JSONBField if referenced directly on models:
if not hasattr(models, "JSONBField"):
    models.JSONBField = models.JSONField


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class WorkspaceNode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="nodes")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    type = models.CharField(max_length=64, db_index=True)
    rank = models.CharField(max_length=255, default="0|h:", db_index=True)
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    properties = models.JSONBField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["rank"]
        indexes = [
            models.Index(fields=["workspace", "parent", "rank"]),
            models.Index(fields=["workspace", "type"]),
            GinIndex(fields=["properties"]),
        ]

    def __str__(self):
        return f"{self.title or self.type} ({self.id})"


class Character(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="characters")
    name = models.CharField(max_length=120)
    avatar = models.URLField(blank=True)
    metadata = models.JSONBField(default=dict, blank=True)

    def __str__(self):
        return self.name


class Shot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scene = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE, related_name="shots")
    shot_number = models.CharField(max_length=32)
    shot_type = models.CharField(max_length=64, blank=True)
    lens = models.CharField(max_length=64, blank=True)
    storyboard_url = models.URLField(blank=True)
    storyboard_file = models.FileField(upload_to="storyboards/", blank=True, null=True)
    duration_seconds = models.FloatField(default=0.0)
    blocks = models.ManyToManyField(
        WorkspaceNode, through="ShotBlockCoverage", related_name="covered_by_shots"
    )

    def __str__(self):
        return f"Shot {self.shot_number}"


class ShotBlockCoverage(models.Model):
    shot = models.ForeignKey(Shot, on_delete=models.CASCADE)
    block = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE)
    order_index = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("shot", "block")
        ordering = ["order_index"]

    def __str__(self):
        return f"{self.shot} -> {self.block} (#{self.order_index})"


class BreakdownElement(models.Model):
    CATEGORY_CHOICES = [
        ("PROP", "Prop"),
        ("COSTUME", "Costume"),
        ("VFX", "VFX"),
        ("SFX", "SFX"),
        ("LOCATION", "Location"),
        ("VEHICLE", "Vehicle"),
        ("MAKEUP", "Makeup"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="breakdown_elements"
    )
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=150)
    notes = models.TextField(blank=True)
    blocks = models.ManyToManyField(
        WorkspaceNode, related_name="breakdown_elements", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.category}] {self.name}"

