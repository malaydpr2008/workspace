from django.core.management.base import BaseCommand
from core.models import Workspace, WorkspaceNode, Character, Shot, ShotBlockCoverage


class Command(BaseCommand):
    help = "Seeds initial sample data for workspace, composite nodes, characters, and shots."

    def handle(self, *args, **options):
        self.stdout.write("Starting workspace seeding...")

        # 1. Workspace
        workspace, created = Workspace.objects.get_or_create(
            slug="production-studio",
            defaults={"name": "Production Studio"},
        )
        if not created:
            self.stdout.write("Workspace already exists, updating nodes...")
            # Clean up prior seed nodes for idempotency
            workspace.nodes.all().delete()
            workspace.characters.all().delete()

        # 2. Character
        character = Character.objects.create(
            workspace=workspace,
            name="Elena",
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb",
            metadata={"role": "Lead Architect", "accent": "Neutral"},
        )
        self.stdout.write(f"Created character: {character.name}")

        # 3. Screenplay Root + Scene + Action + Dialogue
        screenplay = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=None,
            type="screenplay",
            title="Inception of Thought",
            rank="0|h0:",
            content="",
            properties={"format": "feature", "author": "Elena Vance"},
        )

        scene = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=screenplay,
            type="scene",
            title="EXT. NEON ROOFTOP - NIGHT",
            rank="0|h0:h0:",
            content="",
            properties={"time": "NIGHT", "location": "ROOFTOP", "setting": "EXT"},
        )

        action = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=scene,
            type="action",
            title="",
            content="Rain washes over the high-rise terrace as city holograms flicker into the mist.",
            rank="0|h0:h0:h0:",
            properties={},
        )

        dialogue = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=scene,
            type="dialogue",
            title="",
            content="We only have one shot at this sequence. Check the lenses.",
            rank="0|h0:h0:h1:",
            properties={
                "character_id": str(character.id),
                "character_name": character.name,
                "parenthetical": "whispering against the storm",
            },
        )
        self.stdout.write("Created Screenplay hierarchy (Scene, Action, Dialogue)")

        # 4. Shot attached to Scene and covering Dialogue block
        shot = Shot.objects.create(
            scene=scene,
            shot_number="1A",
            shot_type="MEDIUM CLOSE-UP",
            lens="50mm Anamorphic",
            storyboard_url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
            duration_seconds=3.5,
        )
        coverage = ShotBlockCoverage.objects.create(
            shot=shot,
            block=dialogue,
            order_index=0,
        )
        self.stdout.write(f"Created Shot {shot.shot_number} covering dialogue block")

        # 5. Story Root + Chapter + Paragraphs
        story = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=None,
            type="story",
            title="The Chronicles of Antigravity",
            rank="0|h1:",
            content="",
            properties={"genre": "Sci-Fi", "target_words": 80000},
        )

        chapter = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=story,
            type="chapter",
            title="Chapter 1: The Singularity Event",
            rank="0|h1:h0:",
            content="",
            properties={"chapter_number": 1},
        )

        WorkspaceNode.objects.create(
            workspace=workspace,
            parent=chapter,
            type="paragraph",
            title="",
            content="The laboratory hummed with the quiet, persistent tension of imminent discovery.",
            rank="0|h1:h0:h0:",
            properties={},
        )

        WorkspaceNode.objects.create(
            workspace=workspace,
            parent=chapter,
            type="paragraph",
            title="",
            content="Across the central monitor, composite nodes realigned into crystalline hierarchies, rendering legacy paradigms obsolete.",
            rank="0|h1:h0:h1:",
            properties={},
        )
        self.stdout.write("Created Story hierarchy (Chapter, Paragraphs)")

        # 6. Article Root
        article = WorkspaceNode.objects.create(
            workspace=workspace,
            parent=None,
            type="article",
            title="Universal Composite Node Architectures",
            content="An architectural deep dive into hierarchical single-table tree models for creative workspaces.",
            rank="0|h2:",
            properties={"reading_time_minutes": 8, "tags": ["architecture", "systems"]},
        )
        self.stdout.write(f"Created Article root node: {article.title}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded workspace database."))
