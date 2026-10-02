from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import (
    Workspace,
    WorkspaceNode,
    Character,
    Shot,
    ShotBlockCoverage,
    BreakdownElement,
    DocumentSnapshot,
    ShootingSchedule,
    ShootingDay,
    StripboardItem,
)


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


class DocumentSnapshotAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Studio Lot", slug="studio-lot")
        self.script = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Neon Horizon",
            rank="0|h0:",
            revision_color="WHITE",
        )
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.script,
            type="scene",
            title="INT. CONTROL ROOM - NIGHT",
            rank="0|h1:",
        )
        self.action = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="action",
            content="Rain taps against the observation glass.",
            rank="0|h2:",
        )

    def test_snapshot_creation_and_retrieval(self):
        url = reverse("documentsnapshot-list")
        snapshot_payload = {
            "document_node": str(self.script.id),
            "label": "Table Read Polish",
            "revision_color": "BLUE",
            "snapshot_data": {
                "nodes": [
                    {
                        "id": str(self.script.id),
                        "title": "Neon Horizon",
                        "type": "screenplay",
                    },
                    {
                        "id": str(self.scene.id),
                        "parent": str(self.script.id),
                        "title": "INT. CONTROL ROOM - NIGHT",
                        "type": "scene",
                    },
                    {
                        "id": str(self.action.id),
                        "parent": str(self.scene.id),
                        "content": "Rain taps against the observation glass.",
                        "type": "action",
                    },
                ]
            },
        }

        response = self.client.post(url, snapshot_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["label"], "Table Read Polish")
        self.assertEqual(response.data["revision_color"], "BLUE")
        self.assertEqual(str(response.data["workspace"]), str(self.workspace.id))
        self.assertEqual(
            len(response.data["snapshot_data"]["nodes"]), 3
        )

        # Filter by document_node
        list_url = f"{url}?document_node={self.script.id}"
        list_resp = self.client.get(list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

    def test_snapshot_restore(self):
        # Create snapshot of current state
        snapshot = DocumentSnapshot.objects.create(
            workspace=self.workspace,
            document_node=self.script,
            label="Frozen Pre-Production Draft",
            revision_color="PINK",
            snapshot_data={
                "nodes": [
                    {
                        "id": str(self.script.id),
                        "title": "Neon Horizon (Pink Rev)",
                        "type": "screenplay",
                    },
                    {
                        "id": str(self.scene.id),
                        "parent": str(self.script.id),
                        "title": "INT. CONTROL ROOM - NIGHT (RESTORED)",
                        "type": "scene",
                        "rank": "0|h1:",
                    },
                ]
            },
        )

        # Modify active script
        self.action.content = "Modified text before restore."
        self.action.save()

        # Call restore
        restore_url = reverse("documentsnapshot-restore", kwargs={"pk": snapshot.id})
        response = self.client.post(restore_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

        # Verify restored state
        self.script.refresh_from_db()
        self.assertEqual(self.script.revision_color, "PINK")
        self.assertEqual(self.script.title, "Neon Horizon (Pink Rev)")
        self.assertEqual(
            WorkspaceNode.objects.filter(parent=self.script).count(), 1
        )


class ShootingScheduleAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Film Lot", slug="film-lot")
        self.screenplay = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Chronos Feature",
            rank="0|h0:",
        )
        self.scene1 = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.screenplay,
            type="scene",
            title="INT. LAB - DAY",
            rank="0|h1:",
        )
        self.scene2 = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.screenplay,
            type="scene",
            title="EXT. ALLEY - NIGHT",
            rank="0|h2:",
        )

    def test_schedule_and_day_creation(self):
        # Create Schedule
        sched_url = reverse("shootingschedule-list")
        sched_resp = self.client.post(
            sched_url,
            {
                "screenplay": str(self.screenplay.id),
                "title": "Principal Photography - Draft 1",
            },
            format="json",
        )
        self.assertEqual(sched_resp.status_code, status.HTTP_201_CREATED)
        sched_id = sched_resp.data["id"]
        self.assertEqual(sched_resp.data["title"], "Principal Photography - Draft 1")

        # Create Shooting Day
        day_url = reverse("shootingday-list")
        day_resp = self.client.post(
            day_url,
            {
                "schedule": sched_id,
                "day_number": 1,
                "call_time": "06:30 AM",
                "shooting_location": "Stage 4, Main Lot",
                "order": 1,
            },
            format="json",
        )
        self.assertEqual(day_resp.status_code, status.HTTP_201_CREATED)
        day_id = day_resp.data["id"]
        self.assertEqual(day_resp.data["day_number"], 1)

        # Create Stripboard items
        strip_url = reverse("stripboarditem-list")
        strip1_resp = self.client.post(
            strip_url,
            {
                "schedule": sched_id,
                "shooting_day": day_id,
                "scene": str(self.scene1.id),
                "order": 1,
            },
            format="json",
        )
        self.assertEqual(strip1_resp.status_code, status.HTTP_201_CREATED)
        strip1_id = strip1_resp.data["id"]

        banner_resp = self.client.post(
            strip_url,
            {
                "schedule": sched_id,
                "shooting_day": day_id,
                "is_banner": True,
                "banner_title": "LUNCH BREAK",
                "order": 2,
            },
            format="json",
        )
        self.assertEqual(banner_resp.status_code, status.HTTP_201_CREATED)
        banner_id = banner_resp.data["id"]
        self.assertTrue(banner_resp.data["is_banner"])

        # Test batch reorder
        reorder_url = reverse("stripboarditem-reorder")
        reorder_resp = self.client.post(
            reorder_url,
            [
                {"id": strip1_id, "order": 2},
                {"id": banner_id, "order": 1},
            ],
            format="json",
        )
        self.assertEqual(reorder_resp.status_code, status.HTTP_200_OK)

        strip1 = StripboardItem.objects.get(id=strip1_id)
        banner = StripboardItem.objects.get(id=banner_id)
        self.assertEqual(strip1.order, 2)
        self.assertEqual(banner.order, 1)

        # Filter strips by schedule
        filter_resp = self.client.get(f"{strip_url}?schedule={sched_id}")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_resp.data), 2)

