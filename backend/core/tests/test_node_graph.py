import uuid
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Workspace, Node, Edge


class NodeGraphTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.workspace = Workspace.objects.create(name="Graph Studio", slug="graph-studio")

    def test_node_creation_coordinates_and_json_data(self):
        """Test node creation, coordinate update, and JSON data persistence."""
        node = Node.objects.create(
            workspace=self.workspace,
            type="universalNode",
            title="Custom Prompt Node",
            category="input",
            position_x=150.5,
            position_y=275.25,
            data={"prompt": "A cinematic shot of a rainy neon city", "seed": 42},
        )

        self.assertEqual(node.title, "Custom Prompt Node")
        self.assertEqual(node.category, "input")
        self.assertEqual(node.position_x, 150.5)
        self.assertEqual(node.position_y, 275.25)
        self.assertEqual(node.data["seed"], 42)

        # Update coordinates and JSON data
        node.position_x = 320.0
        node.position_y = 440.0
        node.data["seed"] = 100
        node.save()

        node.refresh_from_db()
        self.assertEqual(node.position_x, 320.0)
        self.assertEqual(node.position_y, 440.0)
        self.assertEqual(node.data["seed"], 100)

    def test_edge_creation_and_cascade_on_node_deletion(self):
        """Test edge creation and verify foreign key cascade on node deletion."""
        node1 = Node.objects.create(
            workspace=self.workspace,
            title="Node 1",
            category="input",
            position_x=0.0,
            position_y=0.0,
        )
        node2 = Node.objects.create(
            workspace=self.workspace,
            title="Node 2",
            category="output",
            position_x=300.0,
            position_y=0.0,
        )

        edge = Edge.objects.create(
            id=f"xy-edge__{node1.id}-{node2.id}",
            workspace=self.workspace,
            source=node1,
            target=node2,
            source_handle="out-1",
            target_handle="in-1",
        )

        self.assertEqual(Edge.objects.filter(id=edge.id).count(), 1)
        self.assertEqual(node1.outgoing_edges.count(), 1)
        self.assertEqual(node2.incoming_edges.count(), 1)

        # Deleting source node should cascade-delete edge
        node1.delete()
        self.assertEqual(Edge.objects.filter(id=edge.id).count(), 0)

    def test_workspace_graph_get_endpoint(self):
        """Test GET /api/workspaces/{id}/graph/."""
        node1 = Node.objects.create(
            workspace=self.workspace,
            title="Node A",
            category="input",
            position_x=10.0,
            position_y=20.0,
            data={"val": 1},
        )
        node2 = Node.objects.create(
            workspace=self.workspace,
            title="Node B",
            category="output",
            position_x=200.0,
            position_y=20.0,
            data={"val": 2},
        )
        Edge.objects.create(
            id=f"xy-edge__{node1.id}-{node2.id}",
            workspace=self.workspace,
            source=node1,
            target=node2,
        )

        response = self.client.get(f"/api/workspaces/{self.workspace.id}/graph/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn("workspace", data)
        self.assertIn("nodes", data)
        self.assertIn("edges", data)
        self.assertEqual(len(data["nodes"]), 2)
        self.assertEqual(len(data["edges"]), 1)
        self.assertEqual(data["nodes"][0]["position"]["x"], 10.0)

    def test_workspace_graph_sync_endpoint(self):
        """Test POST /api/workspaces/{id}/graph/sync/ debounced bulk layout synchronization."""
        # Initial node
        existing_node = Node.objects.create(
            workspace=self.workspace,
            title="Old Node",
            category="input",
            position_x=50.0,
            position_y=50.0,
        )

        new_uuid = str(uuid.uuid4())
        sync_payload = {
            "nodes": [
                {
                    "id": str(existing_node.id),
                    "title": "Old Node Updated",
                    "category": "input",
                    "position": {"x": 120.0, "y": 140.0},
                    "data": {"param": "val1"},
                    "is_collapsed": True,
                },
                {
                    "id": new_uuid,
                    "title": "Newly Added Node",
                    "category": "transform",
                    "position": {"x": 400.0, "y": 200.0},
                    "data": {"filter": "sepia"},
                    "is_collapsed": False,
                },
            ],
            "edges": [
                {
                    "id": f"xy-edge__{existing_node.id}-{new_uuid}",
                    "source": str(existing_node.id),
                    "target": new_uuid,
                    "sourceHandle": "out",
                    "targetHandle": "in",
                }
            ],
        }

        response = self.client.post(
            f"/api/workspaces/{self.workspace.id}/graph/sync/",
            sync_payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["status"], "synced")
        self.assertEqual(len(data["nodes"]), 2)
        self.assertEqual(len(data["edges"]), 1)

        existing_node.refresh_from_db()
        self.assertEqual(existing_node.title, "Old Node Updated")
        self.assertEqual(existing_node.position_x, 120.0)
        self.assertEqual(existing_node.position_y, 140.0)
        self.assertTrue(existing_node.is_collapsed)

        new_node = Node.objects.get(id=new_uuid)
        self.assertEqual(new_node.title, "Newly Added Node")
        self.assertEqual(new_node.category, "transform")
        self.assertEqual(new_node.data["filter"], "sepia")

        edge = Edge.objects.get(id=f"xy-edge__{existing_node.id}-{new_uuid}")
        self.assertEqual(edge.source, existing_node)
        self.assertEqual(edge.target, new_node)
        self.assertEqual(edge.source_handle, "out")

    def test_granular_crud_nodes_and_edges(self):
        """Test POST, PATCH, and DELETE endpoints for nodes and edges."""
        # 1. Create Node
        create_res = self.client.post(
            f"/api/workspaces/{self.workspace.id}/nodes/",
            {
                "title": "Granular Node",
                "category": "output",
                "position": {"x": 500.0, "y": 300.0},
                "data": {"volume": 0.8},
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        node_id = create_res.json()["id"]

        # 2. Patch Node
        patch_res = self.client.patch(
            f"/api/workspaces/{self.workspace.id}/nodes/{node_id}/",
            {"title": "Renamed Granular Node", "position": {"x": 550.0, "y": 350.0}},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.json()["title"], "Renamed Granular Node")
        self.assertEqual(patch_res.json()["position"]["x"], 550.0)

        # 3. Create Second Node and Edge
        node2_res = self.client.post(
            f"/api/workspaces/{self.workspace.id}/nodes/",
            {"title": "Target Node", "position": {"x": 700.0, "y": 350.0}},
            format="json",
        )
        node2_id = node2_res.json()["id"]

        edge_res = self.client.post(
            f"/api/workspaces/{self.workspace.id}/edges/",
            {
                "id": f"xy-edge__{node_id}-{node2_id}",
                "source": node_id,
                "target": node2_id,
                "sourceHandle": "src-h",
                "targetHandle": "tgt-h",
            },
            format="json",
        )
        self.assertEqual(edge_res.status_code, status.HTTP_201_CREATED)

        # 4. Delete Edge
        del_edge_res = self.client.delete(
            f"/api/workspaces/{self.workspace.id}/edges/{f'xy-edge__{node_id}-{node2_id}'}/"
        )
        self.assertEqual(del_edge_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Edge.objects.filter(id=f"xy-edge__{node_id}-{node2_id}").count(), 0)

        # 5. Delete Node
        del_node_res = self.client.delete(f"/api/workspaces/{self.workspace.id}/nodes/{node_id}/")
        self.assertEqual(del_node_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Node.objects.filter(id=node_id).count(), 0)
