from django.core.management.base import BaseCommand
from core.models import (
    Workspace,
    WorkspaceNode,
    Character,
    Shot,
    ShotBlockCoverage,
    ShootingSchedule,
    ShootingDay,
    StripboardItem,
    ProductionBudget,
    BudgetCategory,
    BudgetLineItem,
    ProductionMilestone,
)


class Command(BaseCommand):
    help = "Seeds distinct domain workspaces: Film Studio, Novel Studio, and Article Codex."

    def handle(self, *args, **options):
        self.stdout.write("Starting domain-separated workspace seeding...")

        # =========================================================================
        # 1. FILM STUDIO WORKSPACE: Inception of Thought
        # =========================================================================
        film_ws, created = Workspace.objects.get_or_create(
            slug="production-studio",
            defaults={
                "name": "Inception of Thought",
                "project_type": "film",
                "description": "Cyberpunk Neo-Noir Feature Film exploring recursive virtual realities.",
            },
        )
        film_ws.name = "Inception of Thought"
        film_ws.project_type = "film"
        film_ws.description = "Cyberpunk Neo-Noir Feature Film exploring recursive virtual realities."
        film_ws.save()

        # Clean existing nodes and records for idempotency
        film_ws.nodes.all().delete()
        film_ws.characters.all().delete()
        ShootingSchedule.objects.filter(screenplay__workspace=film_ws).delete()
        ProductionBudget.objects.filter(screenplay__workspace=film_ws).delete()
        ProductionMilestone.objects.filter(workspace=film_ws).delete()

        # Character
        character_elena = Character.objects.create(
            workspace=film_ws,
            name="Elena",
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            metadata={"role": "Lead Architect", "accent": "Neutral"},
        )
        character_padmja = Character.objects.create(
            workspace=film_ws,
            name="Padmja",
            avatar="https://images.unsplash.com/photo-1517841905240-472988babdf9",
            metadata={"role": "Lead Engineer", "accent": "American"},
        )

        # Screenplay Root
        screenplay = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=None,
            type="screenplay",
            title="Inception of Thought",
            rank="0|h0:",
            content="",
            properties={
                "format": "feature",
                "writer": "Elena Vance",
                "author": "Elena Vance",
                "status": "draft",
            },
        )

        # Scene 1: EXT. NEON ROOFTOP - NIGHT
        scene1 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=screenplay,
            type="scene",
            title="EXT. NEON ROOFTOP - NIGHT",
            rank="0|h0:h0:",
            content="",
            properties={
                "scene_number": "1",
                "time": "NIGHT",
                "location": "ROOFTOP",
                "setting": "EXT",
            },
        )

        action1 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=scene1,
            type="action",
            title="",
            content="Rain washes over the high-rise terrace as city holograms flicker into the mist.",
            rank="0|h0:h0:h0:",
            properties={},
        )

        dialogue1 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=scene1,
            type="dialogue",
            title="",
            content="We only have one shot at this sequence. Check the lenses.",
            rank="0|h0:h0:h1:",
            properties={
                "character_id": str(character_padmja.id),
                "character_name": character_padmja.name,
                "parenthetical": "whispering against the storm",
            },
        )

        action1_2 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=scene1,
            type="action",
            title="",
            content="Padmja activates the quantum scanner. The air shimmers with cold blue light.",
            rank="0|h0:h0:h2:",
            properties={},
        )

        # Shot for Scene 1
        shot1a = Shot.objects.create(
            scene=scene1,
            shot_number="1A",
            shot_type="MEDIUM CLOSE-UP",
            lens="50mm Anamorphic",
            storyboard_url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
            duration_seconds=3.5,
        )
        ShotBlockCoverage.objects.create(shot=shot1a, block=dialogue1, order_index=0)

        # Scene 2: INT. SUB-LEVEL LAB - NIGHT
        scene2 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=screenplay,
            type="scene",
            title="INT. SUB-LEVEL LAB - NIGHT",
            rank="0|h0:h1:",
            content="",
            properties={
                "scene_number": "2",
                "time": "NIGHT",
                "location": "SUB-LEVEL LAB",
                "setting": "INT",
            },
        )

        action2 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=scene2,
            type="action",
            title="",
            content="Banks of servers hum in cold rhythmic pulses. Elena steps onto the biometric scanner pad.",
            rank="0|h0:h1:h0:",
            properties={},
        )

        dialogue2 = WorkspaceNode.objects.create(
            workspace=film_ws,
            parent=scene2,
            type="dialogue",
            title="",
            content="Initiating neural synchronization. Keep the emergency decoupling protocol online.",
            rank="0|h0:h1:h1:",
            properties={
                "character_id": str(character_elena.id),
                "character_name": character_elena.name,
            },
        )

        shot2a = Shot.objects.create(
            scene=scene2,
            shot_number="2A",
            shot_type="WIDE ESTABLISHING",
            lens="24mm Prime",
            duration_seconds=5.0,
        )
        ShotBlockCoverage.objects.create(shot=shot2a, block=action2, order_index=0)

        # Production Logistics: Schedule & Stripboard
        sched = ShootingSchedule.objects.create(
            workspace=film_ws,
            screenplay=screenplay,
            title="Principal Photography - Alpha Schedule",
        )
        day1 = ShootingDay.objects.create(
            schedule=sched,
            day_number=1,
            date="2026-11-15",
            order=1,
            shooting_location="Neon Rooftop Stage B",
        )
        day2 = ShootingDay.objects.create(
            schedule=sched,
            day_number=2,
            date="2026-11-16",
            order=2,
            shooting_location="Sub-Level Cryo Lab Stage 4",
        )
        StripboardItem.objects.create(
            schedule=sched,
            scene=scene1,
            shooting_day=day1,
            order=1,
            is_banner=False,
        )
        StripboardItem.objects.create(
            schedule=sched,
            scene=scene2,
            shooting_day=day2,
            order=2,
            is_banner=False,
        )

        # Budget & Accounting
        budget = ProductionBudget.objects.create(
            screenplay=screenplay,
            workspace=film_ws,
            title="Principal Production Budget 2026",
            currency="USD",
            contingency_percentage=10.0,
        )
        cat_prod = BudgetCategory.objects.create(
            budget=budget,
            code="1000",
            name="Above The Line & Direction",
            tier="ATL",
            order=1,
        )
        BudgetLineItem.objects.create(
            category=cat_prod,
            account_code="1010",
            description="Director & Screenplay Rights",
            quantity=1.0,
            rate=350000.00,
            actual_cost=350000.00,
        )
        cat_camera = BudgetCategory.objects.create(
            budget=budget,
            code="2000",
            name="Camera & Lighting Equipment",
            tier="BTL_PRODUCTION",
            order=2,
        )
        BudgetLineItem.objects.create(
            category=cat_camera,
            account_code="2010",
            description="Anamorphic Lens Kit & Alexa 35 Package",
            quantity=1.0,
            rate=150000.00,
            actual_cost=75000.00,
        )

        # Milestones
        ProductionMilestone.objects.create(
            workspace=film_ws,
            screenplay=screenplay,
            title="Principal Photography Start",
            phase="PRODUCTION",
            start_date="2026-11-15",
            end_date="2026-12-20",
            status="IN_PROGRESS",
            progress_percentage=25,
        )

        self.stdout.write(f"Seeded Film Studio: {film_ws.name}")

        # =========================================================================
        # 2. NOVEL STUDIO WORKSPACE: Chronicles of Antigravity
        # =========================================================================
        novel_ws, _ = Workspace.objects.get_or_create(
            slug="chronicles-of-antigravity",
            defaults={
                "name": "Chronicles of Antigravity",
                "project_type": "novel",
                "description": "Hard science fiction novel detailing the discovery of gravimetric displacement.",
            },
        )
        novel_ws.name = "Chronicles of Antigravity"
        novel_ws.project_type = "novel"
        novel_ws.description = "Hard science fiction novel detailing the discovery of gravimetric displacement."
        novel_ws.save()

        novel_ws.nodes.all().delete()

        story = WorkspaceNode.objects.create(
            workspace=novel_ws,
            parent=None,
            type="story",
            title="The Chronicles of Antigravity",
            rank="0|h0:",
            content="",
            properties={"genre": "Sci-Fi", "target_words": 90000, "author": "Solo Creator"},
        )

        chapter1 = WorkspaceNode.objects.create(
            workspace=novel_ws,
            parent=story,
            type="chapter",
            title="Chapter 1: The Singularity Event",
            rank="0|h0:h0:",
            content="",
            properties={"chapter_number": 1},
        )

        WorkspaceNode.objects.create(
            workspace=novel_ws,
            parent=chapter1,
            type="paragraph",
            title="",
            content="The laboratory hummed with the quiet, persistent tension of imminent discovery.",
            rank="0|h0:h0:h0:",
            properties={},
        )

        WorkspaceNode.objects.create(
            workspace=novel_ws,
            parent=chapter1,
            type="paragraph",
            title="",
            content="Across the central monitor, composite nodes realigned into crystalline hierarchies, rendering legacy paradigms obsolete.",
            rank="0|h0:h0:h1:",
            properties={},
        )

        chapter2 = WorkspaceNode.objects.create(
            workspace=novel_ws,
            parent=story,
            type="chapter",
            title="Chapter 2: Horizon Protocol",
            rank="0|h0:h1:",
            content="",
            properties={"chapter_number": 2},
        )

        WorkspaceNode.objects.create(
            workspace=novel_ws,
            parent=chapter2,
            type="paragraph",
            title="",
            content="Sensor readings peaked beyond theoretical thresholds as the metric displacement field stabilized.",
            rank="0|h0:h1:h0:",
            properties={},
        )

        self.stdout.write(f"Seeded Novel Studio: {novel_ws.name}")

        # =========================================================================
        # 3. ARTICLE CODEX WORKSPACE: Universal Codex
        # =========================================================================
        article_ws, _ = Workspace.objects.get_or_create(
            slug="universal-codex",
            defaults={
                "name": "Universal Codex",
                "project_type": "article",
                "description": "Studio architectural documentation, design patterns, and engineering guides.",
            },
        )
        article_ws.name = "Universal Codex"
        article_ws.project_type = "article"
        article_ws.description = "Studio architectural documentation, design patterns, and engineering guides."
        article_ws.save()

        article_ws.nodes.all().delete()

        doc1 = WorkspaceNode.objects.create(
            workspace=article_ws,
            parent=None,
            type="article",
            title="Universal Composite Node Architectures",
            content="An architectural deep dive into hierarchical single-table tree models for creative studios.",
            rank="0|h0:",
            properties={"reading_time_minutes": 8, "tags": ["architecture", "systems"]},
        )

        WorkspaceNode.objects.create(
            workspace=article_ws,
            parent=doc1,
            type="paragraph",
            title="",
            content="A composite tree representation provides sub-millisecond tree traversals with fractional indexing.",
            rank="0|h0:h0:",
            properties={},
        )

        doc2 = WorkspaceNode.objects.create(
            workspace=article_ws,
            parent=None,
            type="article",
            title="Solo Studio Design Guidelines",
            content="Principles for friction-free creative writing and production planning without role gating.",
            rank="0|h1:",
            properties={"reading_time_minutes": 5, "tags": ["design", "principles"]},
        )

        WorkspaceNode.objects.create(
            workspace=article_ws,
            parent=doc2,
            type="paragraph",
            title="",
            content="Solo workflows eliminate permission barriers and allow seamless pivoting across disciplines.",
            rank="0|h1:h0:",
            properties={},
        )

        self.stdout.write(f"Seeded Article Codex: {article_ws.name}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded domain-separated workspaces."))
