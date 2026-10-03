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
    ScriptNote,
    ProductionTake,
    ADRCue,
    AudioSpottingCue,
    ProductionBudget,
    BudgetCategory,
    BudgetLineItem,
    ProductionMilestone,
    WorkspaceMembership,
    StudioActivityLog,
    ScriptCoverageReport,
)
from core.permissions import RolePermissionPolicy


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


class ScriptNoteAndProductionTakeAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Studio One", slug="studio-one")
        self.script = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Dark Matter",
            rank="0|h0:",
        )
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.script,
            type="scene",
            title="INT. BRIDGE - NIGHT",
            rank="0|h1:",
        )
        self.dialogue = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="dialogue",
            content="Shields failing.",
            rank="0|h2:",
        )
        self.shot = Shot.objects.create(
            scene=self.scene,
            shot_number="1A",
            shot_type="CLOSE-UP",
            lens="50mm",
            duration_seconds=4.5,
        )

    def test_script_note_creation_reply_and_resolve(self):
        note_url = reverse("scriptnote-list")
        
        # 1. Create root note
        create_resp = self.client.post(
            note_url,
            {
                "node": str(self.dialogue.id),
                "author_name": "Denis V.",
                "author_role": "DIRECTOR",
                "category": "DIRECTOR",
                "text": "Deliver this with whisper pacing.",
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        note_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["category"], "DIRECTOR")
        self.assertFalse(create_resp.data["is_resolved"])

        # 2. Create threaded reply
        reply_resp = self.client.post(
            note_url,
            {
                "node": str(self.dialogue.id),
                "parent_note": note_id,
                "author_name": "Timothee C.",
                "author_role": "WRITER",
                "category": "CREATIVE",
                "text": "Understood, will emphasize vulnerability.",
            },
            format="json",
        )
        self.assertEqual(reply_resp.status_code, status.HTTP_201_CREATED)

        # 3. Retrieve root note with replies
        detail_resp = self.client.get(reverse("scriptnote-detail", kwargs={"pk": note_id}))
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail_resp.data["replies"]), 1)
        self.assertEqual(detail_resp.data["replies"][0]["author_name"], "Timothee C.")

        # 4. Toggle resolve action
        resolve_url = reverse("scriptnote-toggle-resolve", kwargs={"pk": note_id})
        toggle_resp = self.client.post(resolve_url)
        self.assertEqual(toggle_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(toggle_resp.data["is_resolved"])

    def test_production_take_logging_and_circle_toggle(self):
        take_url = reverse("productiontake-list")

        # 1. Create Take 1
        take1_resp = self.client.post(
            take_url,
            {
                "shot": str(self.shot.id),
                "take_number": 1,
                "status": "FALSE_START",
                "camera_roll": "A01",
                "sound_roll": "SR01",
                "duration_seconds": 2.0,
                "notes": "Actor stumbled on first word.",
            },
            format="json",
        )
        self.assertEqual(take1_resp.status_code, status.HTTP_201_CREATED)
        self.assertFalse(take1_resp.data["is_circle_take"])

        # 2. Create Take 2
        take2_resp = self.client.post(
            take_url,
            {
                "shot": str(self.shot.id),
                "take_number": 2,
                "status": "COMPLETE",
                "camera_roll": "A01",
                "sound_roll": "SR01",
                "duration_seconds": 5.2,
                "notes": "Stunning delivery, print this.",
                "is_circle_take": True,
            },
            format="json",
        )
        self.assertEqual(take2_resp.status_code, status.HTTP_201_CREATED)
        take2_id = take2_resp.data["id"]
        self.assertTrue(take2_resp.data["is_circle_take"])

        # 3. Toggle circle take
        circle_url = reverse("productiontake-toggle-circle", kwargs={"pk": take2_id})
        toggle_resp = self.client.post(circle_url)
        self.assertEqual(toggle_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_resp.data["is_circle_take"])

        # 4. Filter takes by shot
        list_resp = self.client.get(f"{take_url}?shot={self.shot.id}")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 2)


class ADRCueAndAudioSpottingAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Sound Studio", slug="sound-studio")
        self.character = Character.objects.create(
            workspace=self.workspace,
            name="Elena Rostova",
        )
        self.script = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Solaris Protocol",
            rank="0|h0:",
        )
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.script,
            type="scene",
            title="INT. AIRLOCK - NIGHT",
            rank="0|h1:",
        )
        self.dialogue = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="dialogue",
            content="Close the primary blast door now!",
            rank="0|h2:",
        )

    def test_adr_cue_creation_status_update_and_filtering(self):
        adr_url = reverse("adrcue-list")

        # 1. Create ADR Cue
        create_resp = self.client.post(
            adr_url,
            {
                "dialogue_node": str(self.dialogue.id),
                "character": str(self.character.id),
                "cue_number": "ELN-001",
                "reason": "NOISE",
                "priority": "CRITICAL",
                "status": "NEEDS_REVIEW",
                "timecode_in": "01:14:22:10",
                "timecode_out": "01:14:26:05",
                "actor_notes": "Wind machine audible in mic track. Needs urgent re-loop.",
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        cue_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["cue_number"], "ELN-001")
        self.assertEqual(create_resp.data["character_name"], "Elena Rostova")
        self.assertEqual(create_resp.data["dialogue_content"], "Close the primary blast door now!")
        self.assertEqual(create_resp.data["scene_title"], "INT. AIRLOCK - NIGHT")
        self.assertEqual(create_resp.data["status"], "NEEDS_REVIEW")

        # 2. Update status action
        status_url = reverse("adrcue-update-status", kwargs={"pk": cue_id})
        update_resp = self.client.post(status_url, {"status": "APPROVED"}, format="json")
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_resp.data["status"], "APPROVED")

        # 3. Filter by character and status
        filter_resp = self.client.get(f"{adr_url}?character={self.character.id}&status=APPROVED")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_resp.data), 1)
        self.assertEqual(filter_resp.data[0]["id"], cue_id)

    def test_audio_spotting_cue_creation_and_filtering(self):
        spotting_url = reverse("audiospottingcue-list")

        # 1. Create Audio Spotting Cue
        create_resp = self.client.post(
            spotting_url,
            {
                "scene": str(self.scene.id),
                "cue_type": "SCORE",
                "cue_name": "Airlock Tension Theme",
                "timecode_in": "01:14:00:00",
                "timecode_out": "01:15:30:00",
                "notes": "Low cello drone with rising synth pulse.",
                "intensity": "HIGH",
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        cue_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["cue_name"], "Airlock Tension Theme")
        self.assertEqual(create_resp.data["scene_title"], "INT. AIRLOCK - NIGHT")
        self.assertEqual(create_resp.data["intensity"], "HIGH")

        # 2. Filter by scene and cue_type
        filter_resp = self.client.get(f"{spotting_url}?scene={self.scene.id}&cue_type=SCORE")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_resp.data), 1)
        self.assertEqual(filter_resp.data[0]["id"], cue_id)


class ProductionBudgetAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Cyberpunk Thriller", slug="cyberpunk-thriller")
        self.screenplay = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Neon Horizon",
            rank="0|h0:",
        )
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.screenplay,
            type="scene",
            title="INT. RUNNER'S DEN - NIGHT",
            rank="0|h1:",
        )
        self.character = Character.objects.create(
            workspace=self.workspace,
            name="Kaelen Cross",
        )
        self.dialogue = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="dialogue",
            content="They are scanning the sector right now.",
            properties={"character_id": str(self.character.id), "character_name": "Kaelen Cross"},
            rank="0|h1:0|h0:",
        )
        self.element = BreakdownElement.objects.create(
            workspace=self.workspace,
            category="PROP",
            name="Neural Deck Modulator",
        )
        self.adr_cue = ADRCue.objects.create(
            workspace=self.workspace,
            dialogue_node=self.dialogue,
            character=self.character,
            cue_number="KAE-001",
            reason="NOISE",
            priority="CRITICAL",
            status="SCHEDULED",
        )

    def test_budget_calculations_and_variance(self):
        budget_url = reverse("productionbudget-list")
        create_resp = self.client.post(
            budget_url,
            {
                "workspace": str(self.workspace.id),
                "screenplay": str(self.screenplay.id),
                "title": "Principal Photography Master Budget",
                "currency": "USD",
                "contingency_percentage": 10.0,
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        budget_id = create_resp.data["id"]

        # Create Category
        cat_url = reverse("budgetcategory-list")
        cat_resp = self.client.post(
            cat_url,
            {
                "budget": budget_id,
                "code": "1000",
                "name": "STORY RIGHTS",
                "tier": "ATL",
                "order": 1,
            },
            format="json",
        )
        self.assertEqual(cat_resp.status_code, status.HTTP_201_CREATED)
        category_id = cat_resp.data["id"]

        # Create Line Item: 2 days @ 1,000 with 10% fringe = 2,200 estimated
        item_url = reverse("budgetlineitem-list")
        item_resp = self.client.post(
            item_url,
            {
                "category": category_id,
                "account_code": "1001",
                "description": "Lead Screenwriter",
                "rate_type": "DAILY",
                "quantity": 2.0,
                "rate": "1000.00",
                "fringe_percentage": 10.0,
                "actual_cost": "2000.00",
            },
            format="json",
        )
        self.assertEqual(item_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(item_resp.data["estimated_total"]), 2200.00)
        self.assertEqual(float(item_resp.data["variance"]), 200.00)

        # Retrieve budget details with calculated totals
        detail_url = reverse("productionbudget-detail", kwargs={"pk": budget_id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(float(detail_resp.data["atl_subtotal"]), 2200.00)
        self.assertEqual(float(detail_resp.data["subtotal_before_contingency"]), 2200.00)
        self.assertEqual(float(detail_resp.data["contingency_amount"]), 220.00)
        self.assertEqual(float(detail_resp.data["grand_total"]), 2420.00)
        self.assertEqual(float(detail_resp.data["actual_total"]), 2000.00)
        self.assertEqual(float(detail_resp.data["variance"]), 420.00)

    def test_populate_budget_from_workspace(self):
        budget = ProductionBudget.objects.create(
            workspace=self.workspace,
            screenplay=self.screenplay,
            title="Auto-Populate Draft",
            currency="USD",
            contingency_percentage=10.0,
        )
        pop_url = reverse("productionbudget-populate-from-workspace", kwargs={"pk": str(budget.id)})
        resp = self.client.post(pop_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Check categories created
        categories = resp.data["categories"]
        self.assertGreaterEqual(len(categories), 5)
        codes = [c["code"] for c in categories]
        self.assertIn("1000", codes)
        self.assertIn("2000", codes)
        self.assertIn("3000", codes)
        self.assertIn("4000", codes)
        self.assertIn("5000", codes)
        self.assertIn("6000", codes)

        # Check cast line item populated for Kaelen Cross
        cast_cat = next(c for c in categories if c["code"] == "3000")
        cast_descriptions = [item["description"] for item in cast_cat["line_items"]]
        self.assertTrue(any("Kaelen Cross" in d for d in cast_descriptions))

        # Check breakdown element populated for Neural Deck Modulator
        art_cat = next(c for c in categories if c["code"] == "5000")
        art_descriptions = [item["description"] for item in art_cat["line_items"]]
        self.assertTrue(any("Neural Deck Modulator" in d for d in art_descriptions))

        # Check grand total is non-zero
        self.assertGreater(float(resp.data["grand_total"]), 0.0)


class ProductionMilestoneAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Timeline Studio", slug="timeline-studio")
        self.screenplay = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Solaris Drift",
            rank="0|h0:",
        )

    def test_milestone_crud_and_phase_filtering(self):
        url = reverse("productionmilestone-list")
        create_resp = self.client.post(
            url,
            {
                "workspace": str(self.workspace.id),
                "screenplay": str(self.screenplay.id),
                "phase": "PRODUCTION",
                "title": "Principal Photography",
                "start_date": "2026-11-01",
                "end_date": "2026-12-05",
                "status": "PLANNED",
                "progress_percentage": 0,
                "department": "CAMERA",
                "order": 1,
            },
            format="json",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        m_id = create_resp.data["id"]
        self.assertEqual(create_resp.data["screenplay_title"], "Solaris Drift")

        # Filter by phase
        filter_resp = self.client.get(f"{url}?screenplay={self.screenplay.id}&phase=PRODUCTION")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_resp.data), 1)

        # Update status and progress
        detail_url = reverse("productionmilestone-detail", kwargs={"pk": m_id})
        patch_resp = self.client.patch(
            detail_url,
            {"status": "IN_PROGRESS", "progress_percentage": 45},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["status"], "IN_PROGRESS")
        self.assertEqual(patch_resp.data["progress_percentage"], 45)

    def test_initialize_default_timeline(self):
        init_url = reverse("productionmilestone-initialize-default-timeline")
        resp = self.client.post(
            init_url,
            {"screenplay": str(self.screenplay.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp.data), 8)

        phases = [item["phase"] for item in resp.data]
        self.assertIn("DEVELOPMENT", phases)
        self.assertIn("PRE_PRODUCTION", phases)
        self.assertIn("PRODUCTION", phases)
        self.assertIn("POST_PRODUCTION", phases)
        self.assertIn("DELIVERY", phases)

        # Verify DB records
        self.assertEqual(ProductionMilestone.objects.filter(screenplay=self.screenplay).count(), 8)


class WorkspaceMembershipAndRBACAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Starlight Pictures", slug="starlight-pictures")
        self.other_workspace = Workspace.objects.create(name="Indie Lab", slug="indie-lab")

    def test_role_permission_policy_capabilities(self):
        # 1. OWNER
        self.assertTrue(RolePermissionPolicy.can_edit_script("OWNER"))
        self.assertTrue(RolePermissionPolicy.can_edit_budget("OWNER"))
        self.assertTrue(RolePermissionPolicy.can_lock_scenes("OWNER"))
        self.assertTrue(RolePermissionPolicy.can_manage_members("OWNER"))

        # 2. PRODUCER
        self.assertTrue(RolePermissionPolicy.can_edit_script("PRODUCER"))
        self.assertTrue(RolePermissionPolicy.can_edit_budget("PRODUCER"))
        self.assertTrue(RolePermissionPolicy.can_lock_scenes("PRODUCER"))
        self.assertTrue(RolePermissionPolicy.can_manage_members("PRODUCER"))

        # 3. DIRECTOR
        self.assertTrue(RolePermissionPolicy.can_edit_script("DIRECTOR"))
        self.assertFalse(RolePermissionPolicy.can_edit_budget("DIRECTOR"))
        self.assertTrue(RolePermissionPolicy.can_lock_scenes("DIRECTOR"))
        self.assertFalse(RolePermissionPolicy.can_manage_members("DIRECTOR"))

        # 4. WRITER
        self.assertTrue(RolePermissionPolicy.can_edit_script("WRITER"))
        self.assertFalse(RolePermissionPolicy.can_edit_budget("WRITER"))
        self.assertFalse(RolePermissionPolicy.can_lock_scenes("WRITER"))
        self.assertFalse(RolePermissionPolicy.can_manage_members("WRITER"))

        # 5. DEPT_HEAD
        self.assertFalse(RolePermissionPolicy.can_edit_script("DEPT_HEAD"))
        self.assertFalse(RolePermissionPolicy.can_edit_budget("DEPT_HEAD"))
        self.assertFalse(RolePermissionPolicy.can_lock_scenes("DEPT_HEAD"))
        self.assertFalse(RolePermissionPolicy.can_manage_members("DEPT_HEAD"))

        # 6. ACTOR
        self.assertFalse(RolePermissionPolicy.can_edit_script("ACTOR"))
        self.assertFalse(RolePermissionPolicy.can_edit_budget("ACTOR"))
        self.assertFalse(RolePermissionPolicy.can_lock_scenes("ACTOR"))
        self.assertFalse(RolePermissionPolicy.can_manage_members("ACTOR"))

    def test_membership_crud_and_duplicate_rejection(self):
        url = reverse("workspacemembership-list")

        # 1. Create membership
        resp = self.client.post(
            url,
            {
                "workspace": str(self.workspace.id),
                "name": "Christopher Nolan",
                "email": "chris@syncopy.com",
                "role": "DIRECTOR",
                "department": "DIRECTING",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        member_id = resp.data["id"]
        self.assertEqual(resp.data["role"], "DIRECTOR")
        self.assertTrue(resp.data["capabilities"]["can_edit_script"])
        self.assertTrue(resp.data["capabilities"]["can_lock_scenes"])
        self.assertFalse(resp.data["capabilities"]["can_edit_budget"])

        # 2. Reject duplicate email in same workspace
        dup_resp = self.client.post(
            url,
            {
                "workspace": str(self.workspace.id),
                "name": "Chris Dup",
                "email": "chris@syncopy.com",
                "role": "PRODUCER",
            },
            format="json",
        )
        self.assertEqual(dup_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Same email in different workspace is allowed
        diff_ws_resp = self.client.post(
            url,
            {
                "workspace": str(self.other_workspace.id),
                "name": "Chris Nolan",
                "email": "chris@syncopy.com",
                "role": "OWNER",
            },
            format="json",
        )
        self.assertEqual(diff_ws_resp.status_code, status.HTTP_201_CREATED)

        # 4. Filter by workspace and role
        filter_resp = self.client.get(f"{url}?workspace={self.workspace.id}&role=DIRECTOR")
        self.assertEqual(filter_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_resp.data), 1)

        # 5. Patch role to PRODUCER
        detail_url = reverse("workspacemembership-detail", kwargs={"pk": member_id})
        patch_resp = self.client.patch(detail_url, {"role": "PRODUCER"}, format="json")
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["role"], "PRODUCER")
        self.assertTrue(patch_resp.data["capabilities"]["can_edit_budget"])

    def test_current_user_role_action(self):
        url = reverse("workspacemembership-current-user-role")

        # Create explicit member
        WorkspaceMembership.objects.create(
            workspace=self.workspace,
            name="Cillian Murphy",
            email="cillian@peaky.com",
            role="ACTOR",
            department="CAST",
        )

        # Fetch role by email
        resp = self.client.get(f"{url}?workspace={self.workspace.id}&email=cillian@peaky.com")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["role"], "ACTOR")
        self.assertFalse(resp.data["capabilities"]["can_edit_script"])
        self.assertFalse(resp.data["capabilities"]["can_edit_budget"])

        # Fetch for unknown email defaults to OWNER fallback
        resp2 = self.client.get(f"{url}?workspace={self.workspace.id}&email=unknown@studio.com")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["role"], "OWNER")
        self.assertTrue(resp2.data["capabilities"]["can_edit_budget"])


class StudioActivityLogAndWebSocketAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="Live Studio", slug="live-studio")
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="scene",
            title="EXT. ROOFTOP - DUSK",
            rank="0|h0:",
        )

    def test_activity_log_creation_and_filtering(self):
        url = reverse("studioactivitylog-list")

        # 1. Create activity log via API
        payload = {
            "workspace": str(self.workspace.id),
            "actor_name": "Emma Thomas",
            "actor_role": "PRODUCER",
            "action_type": "BUDGET_UPDATE",
            "department": "BUDGET",
            "description": "Approved contingency increase of 10%",
            "target_node": str(self.scene.id),
        }
        create_resp = self.client.post(url, payload, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data["actor_name"], "Emma Thomas")
        self.assertEqual(create_resp.data["department"], "BUDGET")
        self.assertEqual(create_resp.data["target_node_title"], "EXT. ROOFTOP - DUSK")

        # 2. Create another log in SCRIPT department
        StudioActivityLog.objects.create(
            workspace=self.workspace,
            actor_name="Christopher Nolan",
            actor_role="DIRECTOR",
            action_type="SCENE_LOCK",
            department="SCRIPT",
            description="Locked Scene 1 numbers to (1A)",
            target_node=self.scene,
        )

        # 3. Filter by department=BUDGET
        budget_resp = self.client.get(f"{url}?workspace={self.workspace.id}&department=BUDGET")
        self.assertEqual(budget_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(budget_resp.data), 1)
        self.assertEqual(budget_resp.data[0]["action_type"], "BUDGET_UPDATE")

        # 4. Filter by department=SCRIPT
        script_resp = self.client.get(f"{url}?workspace={self.workspace.id}&department=SCRIPT")
        self.assertEqual(script_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(script_resp.data), 1)
        self.assertEqual(script_resp.data[0]["action_type"], "SCENE_LOCK")

        # 5. Filter by action_type=SCENE_LOCK
        lock_resp = self.client.get(f"{url}?workspace={self.workspace.id}&action_type=SCENE_LOCK")
        self.assertEqual(lock_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(lock_resp.data), 1)

    def test_websocket_consumer_flow(self):
        from asgiref.sync import async_to_sync
        from channels.testing import WebsocketCommunicator
        from core.consumers import WorkspaceConsumer

        async def _test():
            communicator = WebsocketCommunicator(
                WorkspaceConsumer.as_asgi(), f"/ws/workspace/{self.workspace.id}/"
            )
            communicator.scope["url_route"] = {"kwargs": {"workspace_id": str(self.workspace.id)}}
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            # Receive initial connection message
            response = await communicator.receive_json_from()
            self.assertEqual(response["action"], "connected")
            self.assertEqual(response["workspace_id"], str(self.workspace.id))

            # Test ping / pong
            await communicator.send_json_to({"action": "ping"})
            response = await communicator.receive_json_from()
            self.assertEqual(response["action"], "pong")

            # Test presence update broadcast
            await communicator.send_json_to({
                "action": "presence_update",
                "user_id": "usr-director-1",
                "user_name": "Director Nolan",
                "user_role": "DIRECTOR",
                "focused_block_id": str(self.scene.id),
            })
            response = await communicator.receive_json_from()
            self.assertEqual(response["action"], "presence_update")
            self.assertEqual(response["user_name"], "Director Nolan")
            self.assertEqual(response["focused_block_id"], str(self.scene.id))

            # Test broadcast mutation
            await communicator.send_json_to({
                "action": "broadcast_mutation",
                "mutation_type": "SCENE_LOCK",
                "payload": {"scene_id": str(self.scene.id), "scene_number": "1A"},
                "actor_name": "Director Nolan",
                "actor_role": "DIRECTOR",
            })
            response = await communicator.receive_json_from()
            self.assertEqual(response["action"], "broadcast_mutation")
            self.assertEqual(response["mutation_type"], "SCENE_LOCK")
            self.assertEqual(response["payload"]["scene_number"], "1A")

            await communicator.disconnect()

        async_to_sync(_test)()


class StudioAIEngineAndCoverageAPITests(APITestCase):
    def setUp(self):
        self.workspace = Workspace.objects.create(name="AI Studio", slug="ai-studio")
        self.screenplay = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Inception Horizon",
            rank="0|h0:",
        )
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.screenplay,
            type="scene",
            title="EXT. ROOFTOP - DUSK",
            rank="0|h1:",
        )
        self.action = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="action",
            content="Cobb checks his vintage brass lighter and draws a concealed firearm as sirens echo in the neon rain.",
            rank="0|h2:",
        )
        self.character = Character.objects.create(
            workspace=self.workspace,
            name="COBB",
            avatar="",
            metadata={"description": "Weary extractor, calm under lethal pressure."},
        )
        self.dialogue_block = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="dialogue",
            content="We have to get out of here before the extraction team finds us.",
            properties={"character_name": "COBB", "character_id": str(self.character.id)},
            rank="0|h3:",
        )

    def test_generate_coverage_report(self):
        url = reverse("scriptcoveragereport-generate-coverage")
        payload = {"screenplay": str(self.screenplay.id)}
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("Inception Horizon", resp.data["title"])
        self.assertIn(resp.data["verdict"], ["RECOMMEND", "CONSIDER", "PASS"])
        self.assertGreaterEqual(resp.data["commercial_viability"], 50)
        self.assertGreaterEqual(resp.data["character_score"], 50)
        self.assertGreaterEqual(resp.data["pacing_score"], 50)
        self.assertTrue(len(resp.data["synopsis"]) > 0)
        self.assertTrue(len(resp.data["strengths"]) > 0)
        self.assertTrue(len(resp.data["weaknesses"]) > 0)

        # Verify activity log was recorded
        log = self.workspace.activity_logs.filter(action_type="COVERAGE_GENERATED").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor_name, "AI Story Copilot")

    def test_coverage_reports_query_filtering(self):
        # Create a report directly
        ScriptCoverageReport.objects.create(
            workspace=self.workspace,
            screenplay=self.screenplay,
            title="Draft Coverage",
            logline="A master thief attempts dream espionage.",
            verdict="RECOMMEND",
            synopsis="Three acts of inception.",
        )
        url = reverse("scriptcoveragereport-list")
        resp = self.client.get(f"{url}?workspace={self.workspace.id}&screenplay={self.screenplay.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["verdict"], "RECOMMEND")

    def test_punch_up_dialogue_action(self):
        url = reverse("workspacenode-punch-up-dialogue", kwargs={"pk": str(self.dialogue_block.id)})
        # Test SHARPER tone
        resp = self.client.post(url, {"tone": "SHARPER"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["tone"], "SHARPER")
        self.assertEqual(resp.data["character_name"], "COBB")
        self.assertGreaterEqual(len(resp.data["suggestions"]), 3)
        self.assertTrue(any("variation" in s for s in resp.data["suggestions"]))

        # Test SUBTEXT tone
        resp_sub = self.client.post(url, {"tone": "SUBTEXT"}, format="json")
        self.assertEqual(resp_sub.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_sub.data["tone"], "SUBTEXT")
        self.assertGreaterEqual(len(resp_sub.data["suggestions"]), 3)

    def test_auto_detect_breakdown_action(self):
        url = reverse("workspacenode-auto-detect-breakdown", kwargs={"pk": str(self.scene.id)})
        resp = self.client.post(url, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data["suggestions"]), 1)
        names = [s["name"] for s in resp.data["suggestions"]]
        # In action text: "lighter", "firearm", "sirens", "neon rain"
        # Should detect Lighter or Firearm
        self.assertTrue(
            any("Lighter" in n or "Firearm" in n or "Pistol" in n or "Prop" in n for n in names)
        )


class RedisChannelLayerConfigurationTests(APITestCase):
    def test_channels_redis_imported_and_configured(self):
        import channels_redis.core
        self.assertIsNotNone(channels_redis.core.RedisChannelLayer)

        # Test settings resolution with REDIS_URL
        from django.conf import settings
        self.assertIn("default", settings.CHANNEL_LAYERS)
        backend_class = settings.CHANNEL_LAYERS["default"]["BACKEND"]
        self.assertIn(backend_class, [
            "channels.layers.InMemoryChannelLayer",
            "channels_redis.core.RedisChannelLayer"
        ])


class RootHealthCheckTests(APITestCase):
    def test_root_health_check_returns_200(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json(), {"status": "ok", "service": "backend", "ready": True})






