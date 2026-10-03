from django.core.management.base import BaseCommand
from core.models import (
    Workspace,
    WorkspaceNode,
    Character,
    Shot,
    ShotBlockCoverage,
    Node,
    Edge,
    WorkspaceEntity,
)


class Command(BaseCommand):
    help = "Seeds initial sample data for workspace, composite nodes, characters, and shots."

    def handle(self, *args, **options):
        self.stdout.write("Starting workspace seeding...")

        # 1. Workspace
        workspace, created = Workspace.objects.get_or_create(
            slug="production-studio",
            defaults={"name": "Production Studio", "viewport_state": {"x": 100, "y": 80, "zoom": 0.9}},
        )
        if not created:
            self.stdout.write("Workspace already exists, updating nodes...")
            # Clean up prior seed nodes for idempotency
            workspace.entities.all().delete()
            workspace.workspace_nodes.all().delete()
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

        # 7. Model C Canonical Workspace Entities
        entity_heading = WorkspaceEntity.objects.create(
            workspace=workspace,
            entity_type="scene_heading",
            title="SCENE 1",
            content="INT. CYBERPUNK LAB - NIGHT",
            order_index=0,
            metadata={"location": "LAB", "setting": "INT", "time": "NIGHT"},
        )

        entity_action = WorkspaceEntity.objects.create(
            workspace=workspace,
            entity_type="action",
            title="",
            content="A bank of monitors flickers in the dim blue light.",
            order_index=1,
            metadata={},
        )

        entity_dialogue = WorkspaceEntity.objects.create(
            workspace=workspace,
            entity_type="dialogue",
            title="ELENA",
            content="The neural handshake is holding, but Daphne keeps dropping packets.",
            order_index=2,
            metadata={"character": "Elena", "parenthetical": "without looking away from the terminal"},
        )
        self.stdout.write("Created Model C canonical entities (scene_heading, action, dialogue)")

        # 8. Infinite Visual Graph: Input (Linked to Entity 3) -> Transform -> Output
        node_input = Node.objects.create(
            workspace=workspace,
            entity=entity_dialogue,
            type="universalNode",
            title="Screenplay Input",
            category="input",
            position_x=100.0,
            position_y=160.0,
            data={
                "entityId": str(entity_dialogue.id),
                "entityType": entity_dialogue.entity_type,
                "label": "Scene Dialogue",
                "title": entity_dialogue.title,
                "content": entity_dialogue.content,
                "text": entity_dialogue.content,
                "format": "Final Draft",
                "inputs": [],
                "outputs": [{"id": "out-text", "name": "Text Stream", "type": "string"}],
            },
        )

        node_transform = Node.objects.create(
            workspace=workspace,
            entity=None,
            type="universalNode",
            title="Dialogue Doctor AI",
            category="transform",
            position_x=520.0,
            position_y=160.0,
            data={
                "model": "gpt-4o-cinematic",
                "temperature": 0.7,
                "style": "Punchier & Subtext-heavy",
                "inputs": [{"id": "in-text", "name": "Source Text", "type": "string"}],
                "outputs": [{"id": "out-processed", "name": "Polished Script", "type": "string"}],
            },
        )

        node_output = Node.objects.create(
            workspace=workspace,
            entity=None,
            type="universalNode",
            title="Production Storyboard",
            category="output",
            position_x=940.0,
            position_y=160.0,
            data={
                "aspectRatio": "16:9 Anamorphic",
                "resolution": "4K Ultra-HD",
                "renderPasses": 32,
                "inputs": [{"id": "in-processed", "name": "Script In", "type": "string"}],
                "outputs": [],
            },
        )

        edge1 = Edge.objects.create(
            id=f"xy-edge__{node_input.id}out-text-{node_transform.id}in-text",
            workspace=workspace,
            source=node_input,
            target=node_transform,
            source_handle="out-text",
            target_handle="in-text",
        )

        edge2 = Edge.objects.create(
            id=f"xy-edge__{node_transform.id}out-processed-{node_output.id}in-processed",
            workspace=workspace,
            source=node_transform,
            target=node_output,
            source_handle="out-processed",
            target_handle="in-processed",
        )

        self.stdout.write(f"Created Graph nodes: {node_input.title} (Linked to {entity_dialogue.id}) -> {node_transform.title} -> {node_output.title}")
        self.stdout.write(f"Created Graph edges: {edge1.id}, {edge2.id}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded workspace database."))

