import uuid
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Workspace, Node, Edge, WorkspaceEntity


class WorkspaceEntityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.workspace = Workspace.objects.create(
            name="Model C Studio",
            slug="model-c-studio",
            viewport_state={"x": 50.0, "y": 75.0, "zoom": 1.2},
        )

    def test_entity_creation_and_reordering(self):
        """Test creation and reordering of WorkspaceEntity records."""
        e1 = WorkspaceEntity.objects.create(
            workspace=self.workspace,
            entity_type="scene_heading",
            title="SCENE 1",
            content="INT. NIGHT CLUB - NIGHT",
            order_index=0,
        )
        e2 = WorkspaceEntity.objects.create(
            workspace=self.workspace,
            entity_type="action",
            content="Strobe lights cut through the heavy smoke.",
            order_index=1,
        )
        e3 = WorkspaceEntity.objects.create(
            workspace=self.workspace,
            entity_type="dialogue",
            title="NEO",
            content="I know why you're here.",
            order_index=2,
        )

        entities = list(self.workspace.entities.all())
        self.assertEqual(len(entities), 3)
        self.assertEqual(entities[0].id, e1.id)
        self.assertEqual(entities[1].id, e2.id)
        self.assertEqual(entities[2].id, e3.id)

        # Test sync_entities endpoint to reorder (swap e2 and e3)
        reorder_payload = {
            "entities": [
                {"id": str(e1.id), "order_index": 0, "title": e1.title, "content": e1.content},
                {"id": str(e3.id), "order_index": 1, "title": e3.title, "content": e3.content},
                {"id": str(e2.id), "order_index": 2, "title": e2.title, "content": e2.content},
            ]
        }
        res = self.client.post(
            f"/api/workspaces/{self.workspace.id}/entities/sync/",
            reorder_payload,
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data["status"], "synced")
        self.assertEqual(data["entities"][1]["id"], str(e3.id))
        self.assertEqual(data["entities"][2]["id"], str(e2.id))

    def test_cascading_nullifies_node_entity_without_deleting_node(self):
        """Deleting an entity should set node.entity to NULL without deleting the canvas node."""
        entity = WorkspaceEntity.objects.create(
            workspace=self.workspace,
            entity_type="dialogue",
            title="TRINITY",
            content="Follow the white rabbit.",
            order_index=0,
        )
        node = Node.objects.create(
            workspace=self.workspace,
            entity=entity,
            title="Dialogue Node",
            category="input",
            position_x=120.0,
            position_y=240.0,
            data={"entityId": str(entity.id), "text": entity.content},
        )

        self.assertEqual(node.entity_id, entity.id)
        self.assertEqual(entity.canvas_nodes.count(), 1)

        # Delete entity
        entity.delete()

        node.refresh_from_db()
        self.assertIsNone(node.entity)
        self.assertIsNone(node.entity_id)
        self.assertEqual(Node.objects.filter(id=node.id).count(), 1)

    def test_graph_sync_preserves_linked_entity_and_viewport(self):
        """Graph sync endpoint must preserve entity links, viewport coordinates and zoom."""
        entity = WorkspaceEntity.objects.create(
            workspace=self.workspace,
            entity_type="dialogue",
            title="MORPHEUS",
            content="Take the red pill.",
            order_index=0,
        )
        node_id = str(uuid.uuid4())

        sync_payload = {
            "viewport_state": {"x": 250.0, "y": -120.0, "zoom": 1.45},
            "nodes": [
                {
                    "id": node_id,
                    "entity": str(entity.id),
                    "title": "Morpheus Line",
                    "category": "input",
                    "position": {"x": 300.0, "y": 450.0},
                    "data": {"entityId": str(entity.id), "content": entity.content},
                }
            ],
            "edges": [],
        }

        res = self.client.post(
            f"/api/workspaces/{self.workspace.id}/graph/sync/",
            sync_payload,
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(data["viewport_state"]["zoom"], 1.45)
        self.assertEqual(data["viewport_state"]["x"], 250.0)
        self.assertEqual(data["nodes"][0]["entity_id"], str(entity.id))

        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.viewport_state["zoom"], 1.45)

        node = Node.objects.get(id=node_id)
        self.assertEqual(node.entity, entity)

    def test_workspace_detail_returns_entities_and_viewport(self):
        """GET /api/workspaces/{id}/ returns entities, nodes, edges, and viewport_state."""
        WorkspaceEntity.objects.create(
            workspace=self.workspace,
            entity_type="scene_heading",
            content="EXT. MATRIX - DAY",
            order_index=0,
        )
        res = self.client.get(f"/api/workspaces/{self.workspace.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("entities", data)
        self.assertIn("nodes", data)
        self.assertIn("edges", data)
        self.assertIn("viewport_state", data)
        self.assertEqual(len(data["entities"]), 1)
        self.assertEqual(data["viewport_state"]["zoom"], 1.2)
