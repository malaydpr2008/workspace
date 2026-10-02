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
    REVISION_COLOR_CHOICES = [
        ("WHITE", "White"),
        ("BLUE", "Blue"),
        ("PINK", "Pink"),
        ("YELLOW", "Yellow"),
        ("GREEN", "Green"),
        ("GOLDENROD", "Goldenrod"),
        ("BUFF", "Buff"),
        ("SALMON", "Salmon"),
        ("CHERRY", "Cherry"),
    ]

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
    revision_color = models.CharField(
        max_length=32, choices=REVISION_COLOR_CHOICES, default="WHITE"
    )
    is_locked = models.BooleanField(default=False)
    revision_asterisk = models.BooleanField(default=False)
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


class DocumentSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="snapshots"
    )
    document_node = models.ForeignKey(
        WorkspaceNode, on_delete=models.CASCADE, related_name="snapshots"
    )
    label = models.CharField(max_length=255)
    revision_color = models.CharField(
        max_length=32,
        choices=WorkspaceNode.REVISION_COLOR_CHOICES,
        default="WHITE",
    )
    snapshot_data = models.JSONBField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["document_node", "created_at"]),
        ]

    def __str__(self):
        return f"{self.label} ({self.revision_color}) - {self.document_node_id}"


class ShootingSchedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="schedules"
    )
    screenplay = models.ForeignKey(
        WorkspaceNode, on_delete=models.CASCADE, related_name="schedules"
    )
    title = models.CharField(max_length=255, default="Principal Photography")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.screenplay.title})"


class ShootingDay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(
        ShootingSchedule, on_delete=models.CASCADE, related_name="days"
    )
    day_number = models.PositiveIntegerField()
    date = models.DateField(null=True, blank=True)
    call_time = models.CharField(max_length=30, default="07:00 AM")
    shooting_location = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "day_number"]

    def __str__(self):
        return f"Day {self.day_number} - {self.schedule.title}"


class StripboardItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(
        ShootingSchedule, on_delete=models.CASCADE, related_name="strips"
    )
    shooting_day = models.ForeignKey(
        ShootingDay,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="strips",
    )
    scene = models.ForeignKey(
        WorkspaceNode,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="strip_items",
    )
    is_banner = models.BooleanField(default=False)
    banner_title = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        if self.is_banner:
            return f"[BANNER] {self.banner_title}"
        return f"Strip: {self.scene.title if self.scene else 'No Scene'} (Order {self.order})"


class ScriptNote(models.Model):
    ROLE_CHOICES = [
        ("DIRECTOR", "Director"),
        ("PRODUCER", "Producer"),
        ("WRITER", "Writer"),
        ("LEGAL", "Legal"),
        ("SCRIPT_SUPERVISOR", "Script Supervisor"),
    ]

    CATEGORY_CHOICES = [
        ("CREATIVE", "Creative"),
        ("LEGAL", "Legal"),
        ("CONTINUITY", "Continuity"),
        ("PRODUCTION", "Production"),
        ("DIRECTOR", "Director"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="script_notes"
    )
    node = models.ForeignKey(
        WorkspaceNode, on_delete=models.CASCADE, related_name="notes"
    )
    author_name = models.CharField(max_length=120)
    author_role = models.CharField(max_length=60, default="WRITER")
    category = models.CharField(max_length=60, choices=CATEGORY_CHOICES, default="CREATIVE")
    text = models.TextField()
    is_resolved = models.BooleanField(default=False)
    parent_note = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["node", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.category}] {self.author_name} ({self.author_role}): {self.text[:30]}"


class ProductionTake(models.Model):
    STATUS_CHOICES = [
        ("COMPLETE", "Complete"),
        ("INCOMPLETE", "Incomplete"),
        ("FALSE_START", "False Start"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shot = models.ForeignKey(Shot, on_delete=models.CASCADE, related_name="takes")
    take_number = models.PositiveIntegerField(default=1)
    is_circle_take = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="COMPLETE")
    camera_roll = models.CharField(max_length=50, blank=True)
    sound_roll = models.CharField(max_length=50, blank=True)
    duration_seconds = models.FloatField(default=0.0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["take_number"]
        indexes = [
            models.Index(fields=["shot", "take_number"]),
        ]

    def __str__(self):
        star = " ⭐" if self.is_circle_take else ""
        return f"Shot {self.shot_id} - Take {self.take_number}{star}"

