from django.test import TestCase
from core.models import Workspace, WorkspaceNode, Character, Shot, ShotBlockCoverage


class WorkspaceModelTests(TestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Film Project", slug="film-project")

    def test_workspace_creation(self):
        self.assertEqual(str(self.workspace), "Film Project")
        self.assertIsNotNone(self.workspace.id)

    def test_composite_node_hierarchy(self):
        # Create screenplay root document
        screenplay = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="My Screenplay",
            rank="0|h0:",
        )

        # Create scene under screenplay
        scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=screenplay,
            type="scene",
            title="INT. OFFICE - DAY",
            rank="0|h1:",
        )

        # Create dialogue block under scene
        dialogue = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=scene,
            type="dialogue",
            content="Hello world.",
            rank="0|h2:",
            properties={"character_name": "ALICE"},
        )

        self.assertEqual(scene.parent, screenplay)
        self.assertEqual(dialogue.parent, scene)
        self.assertIn(scene, screenplay.children.all())
        self.assertIn(dialogue, scene.children.all())
        self.assertEqual(dialogue.properties.get("character_name"), "ALICE")

    def test_character_and_shot_coverage(self):
        character = Character.objects.create(
            workspace=self.workspace,
            name="Alice",
            metadata={"bio": "Lead investigator"},
        )
        self.assertEqual(str(character), "Alice")

        scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="scene",
            title="EXT. STREET - NIGHT",
            rank="0|h0:",
        )
        action_block = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=scene,
            type="action",
            content="Alice runs into the darkness.",
            rank="0|h1:",
            properties={"character_id": str(character.id)},
        )

        shot = Shot.objects.create(
            scene=scene,
            shot_number="1A",
            shot_type="WIDE",
            lens="35mm",
            duration_seconds=4.5,
        )
        coverage = ShotBlockCoverage.objects.create(shot=shot, block=action_block, order_index=0)

        self.assertEqual(coverage.shot, shot)
        self.assertEqual(coverage.block, action_block)
        self.assertIn(action_block, shot.blocks.all())
        self.assertIn(shot, action_block.covered_by_shots.all())
