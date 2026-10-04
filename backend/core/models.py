import uuid
from django.db import models
from django.contrib.auth.models import User
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


class ADRCue(models.Model):
    REASON_CHOICES = [
        ("NOISE", "Noise / Audio Issue"),
        ("PERFORMANCE", "Performance / Delivery"),
        ("LINE_CHANGE", "Line Change / Alt Take"),
        ("TV_CLEAN", "TV Clean / Censorship"),
        ("ACCENT", "Accent / Diction"),
        ("OTHER", "Other"),
    ]

    PRIORITY_CHOICES = [
        ("CRITICAL", "Critical"),
        ("STANDARD", "Standard"),
        ("OPTIONAL", "Optional"),
    ]

    STATUS_CHOICES = [
        ("NEEDS_REVIEW", "Needs Review"),
        ("SCHEDULED", "Scheduled"),
        ("RECORDED", "Recorded"),
        ("APPROVED", "Approved"),
        ("OMITTED", "Omitted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="adr_cues")
    dialogue_node = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE, related_name="adr_cues")
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name="adr_cues")
    cue_number = models.CharField(max_length=30)
    reason = models.CharField(max_length=50, choices=REASON_CHOICES, default="NOISE")
    priority = models.CharField(max_length=30, choices=PRIORITY_CHOICES, default="STANDARD")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="NEEDS_REVIEW")
    timecode_in = models.CharField(max_length=30, blank=True, default="01:00:00:00")
    timecode_out = models.CharField(max_length=30, blank=True, default="01:00:05:00")
    actor_notes = models.TextField(blank=True)
    audio_file = models.FileField(upload_to="adr_takes/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["cue_number", "created_at"]
        indexes = [
            models.Index(fields=["workspace", "status"]),
            models.Index(fields=["dialogue_node"]),
            models.Index(fields=["character"]),
        ]

    def __str__(self):
        return f"[{self.cue_number}] {self.character.name}: {self.reason} ({self.status})"


class AudioSpottingCue(models.Model):
    CUE_TYPE_CHOICES = [
        ("SCORE", "Score / Score Music"),
        ("SOURCE_MUSIC", "Source Music / Diegetic"),
        ("FOLEY", "Foley"),
        ("SFX", "Sound Effects"),
        ("AMBIENCE", "Environmental Ambience"),
    ]

    INTENSITY_CHOICES = [
        ("LOW", "Low / Subtle"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High / Energetic"),
        ("CLIMACTIC", "Climactic / Dramatic"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="audio_spotting_cues")
    scene = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE, related_name="audio_spotting_cues")
    cue_type = models.CharField(max_length=50, choices=CUE_TYPE_CHOICES, default="SCORE")
    cue_name = models.CharField(max_length=150)
    timecode_in = models.CharField(max_length=30, blank=True)
    timecode_out = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    intensity = models.CharField(max_length=30, choices=INTENSITY_CHOICES, default="MEDIUM")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["workspace", "cue_type"]),
            models.Index(fields=["scene"]),
        ]

    def __str__(self):
        return f"[{self.cue_type}] {self.cue_name} ({self.scene_id})"


class ProductionBudget(models.Model):
    CURRENCY_CHOICES = [
        ("USD", "USD ($)"),
        ("EUR", "EUR (€)"),
        ("GBP", "GBP (£)"),
        ("INR", "INR (₹)"),
        ("CAD", "CAD (C$)"),
        ("AUD", "AUD (A$)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="budgets")
    screenplay = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE, related_name="budgets")
    title = models.CharField(max_length=255, default="Production Budget - Master Draft")
    currency = models.CharField(max_length=10, default="USD")
    contingency_percentage = models.FloatField(default=10.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "screenplay"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.currency})"


class BudgetCategory(models.Model):
    TIER_CHOICES = [
        ("ATL", "Above-The-Line (ATL)"),
        ("BTL_PRODUCTION", "Below-The-Line Production (BTL)"),
        ("BTL_POST", "Below-The-Line Post-Production (BTL)"),
        ("OTHER", "Other / General & Administrative"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget = models.ForeignKey(ProductionBudget, on_delete=models.CASCADE, related_name="categories")
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=150)
    tier = models.CharField(max_length=50, choices=TIER_CHOICES, default="BTL_PRODUCTION")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "code"]
        indexes = [
            models.Index(fields=["budget", "tier"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.tier})"


class BudgetLineItem(models.Model):
    RATE_TYPE_CHOICES = [
        ("FLAT", "Flat Rate"),
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("HOURLY", "Hourly"),
        ("PER_UNIT", "Per Unit"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE, related_name="line_items")
    account_code = models.CharField(max_length=30)
    description = models.CharField(max_length=255)
    rate_type = models.CharField(max_length=30, choices=RATE_TYPE_CHOICES, default="DAILY")
    quantity = models.FloatField(default=1.0)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    fringe_percentage = models.FloatField(default=0.0)
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    character = models.ForeignKey(Character, null=True, blank=True, on_delete=models.SET_NULL, related_name="budget_items")
    breakdown_element = models.ForeignKey(BreakdownElement, null=True, blank=True, on_delete=models.SET_NULL, related_name="budget_items")

    class Meta:
        ordering = ["account_code"]
        indexes = [
            models.Index(fields=["category", "account_code"]),
        ]

    def __str__(self):
        return f"{self.account_code}: {self.description}"


class ProductionMilestone(models.Model):
    PHASE_CHOICES = [
        ("DEVELOPMENT", "Development"),
        ("PRE_PRODUCTION", "Pre-Production"),
        ("PRODUCTION", "Production"),
        ("POST_PRODUCTION", "Post-Production"),
        ("DELIVERY", "Delivery & Distribution"),
    ]

    STATUS_CHOICES = [
        ("PLANNED", "Planned"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("DELAYED", "Delayed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="milestones")
    screenplay = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE, related_name="milestones")
    phase = models.CharField(max_length=60, choices=PHASE_CHOICES, default="PRODUCTION")
    title = models.CharField(max_length=150)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="IN_PROGRESS")
    progress_percentage = models.PositiveIntegerField(default=0)
    department = models.CharField(max_length=60, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "start_date", "created_at"]
        indexes = [
            models.Index(fields=["workspace", "screenplay"]),
            models.Index(fields=["phase"]),
        ]

    def __str__(self):
        return f"[{self.phase}] {self.title} ({self.progress_percentage}%)"


class StudioActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="activity_logs")
    actor_name = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=40, default="", blank=True)
    action_type = models.CharField(max_length=60)
    department = models.CharField(max_length=60, default="SCRIPT")
    description = models.TextField()
    target_node = models.ForeignKey(
        WorkspaceNode, on_delete=models.SET_NULL, null=True, blank=True, related_name="activity_logs"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "-created_at"]),
            models.Index(fields=["workspace", "department"]),
            models.Index(fields=["workspace", "action_type"]),
        ]

    def __str__(self):
        return f"[{self.department}] {self.actor_name} ({self.actor_role}): {self.action_type} - {self.description[:40]}"


class ScriptCoverageReport(models.Model):
    VERDICT_CHOICES = [
        ("RECOMMEND", "Recommend"),
        ("CONSIDER", "Consider"),
        ("PASS", "Pass"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="coverage_reports")
    screenplay = models.ForeignKey(WorkspaceNode, on_delete=models.CASCADE, related_name="coverage_reports")
    title = models.CharField(max_length=255)
    logline = models.TextField()
    verdict = models.CharField(max_length=30, choices=VERDICT_CHOICES, default="CONSIDER")
    commercial_viability = models.PositiveIntegerField(default=75)
    character_score = models.PositiveIntegerField(default=80)
    pacing_score = models.PositiveIntegerField(default=70)
    synopsis = models.TextField()
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    production_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "-created_at"]),
            models.Index(fields=["screenplay", "-created_at"]),
            models.Index(fields=["verdict"]),
        ]

    def __str__(self):
        return f"Coverage: {self.title} [{self.verdict}]"



