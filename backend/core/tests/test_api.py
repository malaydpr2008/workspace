from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import Workspace, WorkspaceNode, Character, Shot, ShotBlockCoverage


class WorkspaceNodeAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Film Project", slug="film-project")
        self.root_node = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Act 1 Script",
            rank="0|h0:",
        )
        self.child_node = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.root_node,
            type="scene",
            title="INT. CAFE - DAY",
            rank="0|h1:",
        )

    def test_get_nodes_list(self):
        url = reverse("workspacenode-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_post_node_creation(self):
        url = reverse("workspacenode-list")
        payload = {
            "workspace": str(self.workspace.id),
            "parent": str(self.root_node.id),
            "type": "scene",
            "title": "EXT. PARK - NIGHT",
            "rank": "0|h2:",
            "content": "A foggy night in the park.",
            "properties": {"lighting": "low"},
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "EXT. PARK - NIGHT")
        self.assertEqual(str(response.data["parent"]), str(self.root_node.id))
        self.assertEqual(WorkspaceNode.objects.count(), 3)

    def test_filter_nodes_by_workspace(self):
        other_workspace = Workspace.objects.create(name="Other", slug="other")
        WorkspaceNode.objects.create(
            workspace=other_workspace,
            type="story",
            title="Other Story",
            rank="0|h0:",
        )

        url = f"{reverse('workspacenode-list')}?workspace_id={self.workspace.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_filter_nodes_by_parent_null_and_parent_id(self):
        # Root nodes filter
        url = f"{reverse('workspacenode-list')}?parent_id=null"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.root_node.id))

        # Child nodes filter
        url = f"{reverse('workspacenode-list')}?parent_id={self.root_node.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.child_node.id))

    def test_filter_nodes_by_type(self):
        url = f"{reverse('workspacenode-list')}?type=scene"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "INT. CAFE - DAY")

    def test_recursive_cte_subtree(self):
        block = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.child_node,
            type="dialogue",
            content="Hello world from deepest node",
            rank="0|h2:",
        )
        url = reverse("workspacenode-subtree", kwargs={"pk": self.root_node.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        node_ids = [n["id"] for n in response.data]
        self.assertIn(str(self.root_node.id), node_ids)
        self.assertIn(str(self.child_node.id), node_ids)
        self.assertIn(str(block.id), node_ids)

    def test_search_nodes(self):
        url = f"{reverse('workspacenode-search')}?q=CAFE&workspace_id={self.workspace.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.child_node.id))


class AdditionalAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Studio", slug="studio")
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="scene",
            title="Scene 1",
            rank="0|h0:",
        )
        self.block = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="dialogue",
            content="Line 1",
            rank="0|h1:",
        )

    def test_character_crud(self):
        url = reverse("character-list")
        create_resp = self.client.post(
            url,
            {"workspace": str(self.workspace.id), "name": "Elena", "avatar": ""},
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)

        list_resp = self.client.get(f"{url}?workspace_id={self.workspace.id}")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

    def test_shot_with_block_coverage(self):
        shot = Shot.objects.create(
            scene=self.scene,
            shot_number="1A",
            shot_type="WIDE",
            lens="50mm",
            duration_seconds=5.0,
        )
        ShotBlockCoverage.objects.create(shot=shot, block=self.block, order_index=0)

        url = f"{reverse('shot-list')}?scene_id={self.scene.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["blocks"]), 1)
        self.assertEqual(response.data[0]["blocks"][0]["id"], str(self.block.id))

    def test_breakdown_element_crud(self):
        url = reverse("breakdownelement-list")
        payload = {
            "workspace": str(self.workspace.id),
            "category": "PROP",
            "name": "Laser Pistol",
            "notes": "Custom silver metallic prop",
            "block_ids": [str(self.block.id)],
        }
        create_resp = self.client.post(url, payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data["name"], "Laser Pistol")
        self.assertEqual(create_resp.data["category"], "PROP")
        self.assertEqual(len(create_resp.data["blocks"]), 1)

        list_resp = self.client.get(f"{url}?workspace_id={self.workspace.id}&category=PROP")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

    def test_shot_image_upload(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        shot = Shot.objects.create(
            scene=self.scene,
            shot_number="2B",
            shot_type="CLOSE-UP",
        )
        image = SimpleUploadedFile("storyboard.png", b"fake_png_data", content_type="image/png")
        url = reverse("shot-upload-image", kwargs={"pk": shot.id})
        response = self.client.post(url, {"file": image}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("storyboard_url", response.data)
        self.assertTrue(response.data["storyboard_url"])

        shot.refresh_from_db()
        self.assertTrue(shot.storyboard_file)
        self.assertTrue(shot.storyboard_url)

