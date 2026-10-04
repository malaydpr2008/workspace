from django.urls import reverse
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import (
    Workspace,
    WorkspaceNode,
    ScriptNote,
    ShootingSchedule,
    ShootingDay,
    StripboardItem,
    Shot,
    ShotBlockCoverage,
    ProductionBudget,
)


class SoloDeveloperWorkflowTests(APITestCase):
    def setUp(self):
        # 1. Create primary workspace
        self.workspace = Workspace.objects.create(name="Studio One", slug="studio-one")

        # 2. Create base hierarchy
        self.screenplay = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="screenplay",
            title="Master Screenplay",
            rank="0|h0:",
            is_locked=False,
        )
        self.scene = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.screenplay,
            type="scene",
            title="INT. COMMAND CENTER - DAY",
            rank="0|h1:",
            is_locked=False,
        )

    def test_locked_node_protects_against_accidental_edit(self):
        """Locked node rejects direct edits to protected fields to prevent accidental overwrites."""
        self.scene.is_locked = True
        self.scene.content = "Original locked content."
        self.scene.save()

        url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        # Direct edit without unlocking raises 400 Bad Request
        response = self.client.patch(url, {"content": "Unauthorized overwrite attempt."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("locked against revisions", str(response.data))

        # Verify content was untouched
        self.scene.refresh_from_db()
        self.assertEqual(self.scene.content, "Original locked content.")

    def test_solo_creator_can_unlock_and_edit_in_single_action(self):
        """Solo creator can toggle is_locked=False and update content simultaneously in a single action."""
        self.scene.is_locked = True
        self.scene.content = "Original locked content."
        self.scene.save()

        url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        # Unlock and edit together
        response = self.client.patch(
            url,
            {"is_locked": False, "content": "Solo creator approved revisions."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.scene.refresh_from_db()
        self.assertFalse(self.scene.is_locked)
        self.assertEqual(self.scene.content, "Solo creator approved revisions.")

    def test_solo_creator_can_toggle_lock(self):
        """Solo creator can freely lock and unlock nodes without role gating."""
        url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        # Lock the node
        res_lock = self.client.patch(url, {"is_locked": True}, format="json")
        self.assertEqual(res_lock.status_code, status.HTTP_200_OK)
        self.scene.refresh_from_db()
        self.assertTrue(self.scene.is_locked)

        # Unlock the node
        res_unlock = self.client.patch(url, {"is_locked": False}, format="json")
        self.assertEqual(res_unlock.status_code, status.HTTP_200_OK)
        self.scene.refresh_from_db()
        self.assertFalse(self.scene.is_locked)

    def test_solo_creator_unrestricted_crud(self):
        """Solo creator has unrestricted CRUD access to all nodes without authentication or role blockers."""
        # 1. POST (create) succeeds without auth
        post_url = reverse("workspacenode-list")
        create_payload = {
            "workspace": str(self.workspace.id),
            "parent": str(self.screenplay.id),
            "type": "scene",
            "title": "Solo Scene",
            "rank": "0|h9:",
        }
        res_post = self.client.post(post_url, create_payload, format="json")
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        new_node_id = res_post.data["id"]

        # 2. PATCH (update) succeeds without auth
        detail_url = reverse("workspacenode-detail", kwargs={"pk": new_node_id})
        res_patch = self.client.patch(detail_url, {"content": "Solo developer edit"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)

        # 3. GET succeeds without auth
        res_get = self.client.get(detail_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data["content"], "Solo developer edit")

        # 4. DELETE succeeds without auth
        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_solo_creator_can_manage_budgets_and_schedules(self):
        """Solo creator has unrestricted access to create budgets and schedules without role friction."""
        budget_url = reverse("productionbudget-list")
        b_res = self.client.post(
            budget_url,
            {
                "workspace": str(self.workspace.id),
                "screenplay": str(self.screenplay.id),
                "title": "Solo Film Budget",
                "currency": "USD",
            },
            format="json",
        )
        self.assertEqual(b_res.status_code, status.HTTP_201_CREATED)

        sched_url = reverse("shootingschedule-list")
        s_res = self.client.post(
            sched_url,
            {
                "workspace": str(self.workspace.id),
                "screenplay": str(self.screenplay.id),
                "title": "Solo Shoot Schedule",
            },
            format="json",
        )
        self.assertEqual(s_res.status_code, status.HTTP_201_CREATED)

    def test_cascade_delete_blocked_on_locked_children(self):
        """Deleting a parent node fails if any child node inside the subtree is locked."""
        self.screenplay.is_locked = False
        self.screenplay.save()
        self.scene.is_locked = True
        self.scene.save()

        url = reverse("workspacenode-detail", kwargs={"pk": str(self.screenplay.id)})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("locked items", response.data.get("detail", "").lower())

        self.assertTrue(WorkspaceNode.objects.filter(id=self.screenplay.id).exists())

        # Unlock scene and retry deletion
        self.scene.is_locked = False
        self.scene.save()

        del_ok_response = self.client.delete(url)
        self.assertEqual(del_ok_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WorkspaceNode.objects.filter(id=self.screenplay.id).exists())

    def test_compact_ranks_command(self):
        """Executes compact_ranks command cleanly and preserves order and monotonicity."""
        parent = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="folder",
            title="Fragmented Ranks Folder",
            rank="0|h0:",
        )
        n1 = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=parent,
            type="scene",
            title="Scene 1",
            rank="0|h0:h1:h2:h3:h4:",
        )
        n2 = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=parent,
            type="scene",
            title="Scene 2",
            rank="0|h0:h1:h2:h3:h5:",
        )
        n3 = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=parent,
            type="scene",
            title="Scene 3",
            rank="0|h0:h1:h2:h3:h5:0|h0:",
        )
        n4 = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=parent,
            type="scene",
            title="Scene 4",
            rank="0|h0:h1:h2:h3:h6:",
        )

        expected_order_ids = [n1.id, n2.id, n3.id, n4.id]
        call_command("compact_ranks", workspace_id=str(self.workspace.id))

        reordered_siblings = list(
            WorkspaceNode.objects.filter(parent=parent).order_by("rank")
        )
        actual_order_ids = [s.id for s in reordered_siblings]
        self.assertEqual(actual_order_ids, expected_order_ids)

        for s in reordered_siblings:
            self.assertEqual(len(s.rank), 9)
            self.assertTrue(s.rank.startswith("0|h"))
            self.assertTrue(s.rank.endswith(":"))

        ranks = [s.rank for s in reordered_siblings]
        self.assertEqual(ranks, sorted(ranks))

    def test_solo_creator_can_create_script_notes(self):
        """Solo creator can create and manage ScriptNotes without authentication friction."""
        url = reverse("scriptnote-list")
        payload = {
            "workspace": str(self.workspace.id),
            "node": str(self.scene.id),
            "author_name": "Solo Creator",
            "author_role": "OWNER",
            "category": "CREATIVE",
            "text": "Add visual subtext to scene heading.",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ScriptNote.objects.count(), 1)

    def test_delete_scheduled_scene_blocked(self):
        """Structural guard: Deleting a scene currently assigned to an active shooting day is rejected with HTTP 400."""
        schedule = ShootingSchedule.objects.create(
            workspace=self.workspace,
            screenplay=self.screenplay,
            title="Principal Photography",
        )
        shooting_day = ShootingDay.objects.create(
            schedule=schedule,
            day_number=1,
            call_time="07:00 AM",
        )
        StripboardItem.objects.create(
            schedule=schedule,
            shooting_day=shooting_day,
            scene=self.scene,
            order=0,
        )

        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data.get("detail"),
            "Cannot delete scene currently assigned to an active shooting day. Remove it from the stripboard schedule first.",
        )
        self.assertTrue(WorkspaceNode.objects.filter(id=self.scene.id).exists())

    def test_delete_unscheduled_scene_cleans_up_satellites(self):
        """Deleting an unscheduled scene decouples ShotBlockCoverage, ScriptNote, and nullifies StripboardItem cleanly."""
        schedule = ShootingSchedule.objects.create(
            workspace=self.workspace,
            screenplay=self.screenplay,
            title="Principal Photography",
        )
        strip = StripboardItem.objects.create(
            schedule=schedule,
            shooting_day=None,
            scene=self.scene,
            order=0,
        )
        shot = Shot.objects.create(
            scene=self.scene,
            shot_number="1A",
        )
        dialogue = WorkspaceNode.objects.create(
            workspace=self.workspace,
            parent=self.scene,
            type="dialogue",
            content="Dialogue to delete.",
            rank="0|h2:",
        )
        coverage = ShotBlockCoverage.objects.create(
            shot=shot,
            block=dialogue,
            order_index=0,
        )
        note = ScriptNote.objects.create(
            workspace=self.workspace,
            node=self.scene,
            author_name="Creator",
            text="Check pacing.",
        )

        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(WorkspaceNode.objects.filter(id=self.scene.id).exists())
        self.assertFalse(WorkspaceNode.objects.filter(id=dialogue.id).exists())
        self.assertFalse(ShotBlockCoverage.objects.filter(id=coverage.id).exists())
        self.assertFalse(ScriptNote.objects.filter(id=note.id).exists())

        strip.refresh_from_db()
        self.assertIsNone(strip.scene)
