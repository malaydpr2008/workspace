from django.urls import reverse
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import (
    Workspace,
    WorkspaceNode,
    WorkspaceMembership,
    ScriptNote,
    ShootingSchedule,
    ShootingDay,
    StripboardItem,
    Shot,
    ShotBlockCoverage,
)


class LockingAndRBACUnitTests(APITestCase):
    def setUp(self):
        # 1. Create primary workspace
        self.workspace = Workspace.objects.create(name="Studio One", slug="studio-one")

        # 2. Create users with different studio roles
        self.user_owner = User.objects.create_user(username="owner", email="owner@studio.com", password="password")
        self.user_director = User.objects.create_user(username="director", email="director@studio.com", password="password")
        self.user_writer = User.objects.create_user(username="writer", email="writer@studio.com", password="password")
        self.user_dept_head = User.objects.create_user(username="dept_head", email="dept@studio.com", password="password")
        self.user_actor = User.objects.create_user(username="actor", email="actor@studio.com", password="password")

        # 3. Create active workspace memberships
        WorkspaceMembership.objects.create(workspace=self.workspace, user=self.user_owner, email=self.user_owner.email, name="Owner User", role="OWNER")
        WorkspaceMembership.objects.create(workspace=self.workspace, user=self.user_director, email=self.user_director.email, name="Director User", role="DIRECTOR")
        WorkspaceMembership.objects.create(workspace=self.workspace, user=self.user_writer, email=self.user_writer.email, name="Writer User", role="WRITER")
        WorkspaceMembership.objects.create(workspace=self.workspace, user=self.user_dept_head, email=self.user_dept_head.email, name="Dept Head User", role="DEPT_HEAD")
        WorkspaceMembership.objects.create(workspace=self.workspace, user=self.user_actor, email=self.user_actor.email, name="Actor User", role="ACTOR")

        # 4. Create base hierarchy
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

    def test_locked_node_rejects_patch_from_writer(self):
        """Writer role attempting to modify a locked scene returns HTTP 403 / 400."""
        # Lock the scene
        self.scene.is_locked = True
        self.scene.content = "Original locked content."
        self.scene.save()

        # Authenticate as writer
        self.client.force_authenticate(user=self.user_writer)
        url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        # Writer attempts to modify content
        response = self.client.patch(url, {"content": "Writer unauthorized revision."}, format="json")
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

        # Verify content was untouched
        self.scene.refresh_from_db()
        self.assertEqual(self.scene.content, "Original locked content.")

        # Writer attempts to change title
        response_title = self.client.patch(url, {"title": "New Title"}, format="json")
        self.assertIn(response_title.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

    def test_director_can_unlock_and_edit_node(self):
        """Director role can toggle is_locked=False and apply changes."""
        self.scene.is_locked = True
        self.scene.content = "Original director lock."
        self.scene.save()

        self.client.force_authenticate(user=self.user_director)
        url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        # Director unlocks and updates content
        response = self.client.patch(
            url,
            {"is_locked": False, "content": "Director approved revisions."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.scene.refresh_from_db()
        self.assertFalse(self.scene.is_locked)
        self.assertEqual(self.scene.content, "Director approved revisions.")

    def test_dept_head_read_only_restriction(self):
        """Dept Head role receives 403 when sending POST, PATCH, or DELETE to /api/nodes/."""
        self.client.force_authenticate(user=self.user_dept_head)

        # 1. POST (create) blocked
        post_url = reverse("workspacenode-list")
        create_payload = {
            "workspace": str(self.workspace.id),
            "parent": str(self.screenplay.id),
            "type": "scene",
            "title": "Dept Head Scene",
            "rank": "0|h9:",
        }
        res_post = self.client.post(post_url, create_payload, format="json")
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

        # 2. PATCH (update) blocked
        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})
        res_patch = self.client.patch(detail_url, {"content": "Dept head edit"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

        # 3. DELETE blocked
        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

        # 4. GET (read-only) allowed
        res_get = self.client.get(detail_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

    def test_cascade_delete_blocked_on_locked_children(self):
        """Deleting a screenplay or folder fails if any child node inside the subtree is locked."""
        # Screenplay is unlocked, but child scene is locked
        self.screenplay.is_locked = False
        self.screenplay.save()
        self.scene.is_locked = True
        self.scene.save()

        # Attempt to delete screenplay as owner/admin
        self.client.force_authenticate(user=self.user_owner)
        url = reverse("workspacenode-detail", kwargs={"pk": str(self.screenplay.id)})

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("locked items", response.data.get("detail", "").lower())

        # Verify screenplay still exists
        self.assertTrue(WorkspaceNode.objects.filter(id=self.screenplay.id).exists())

        # Unlock scene and retry deletion
        self.scene.is_locked = False
        self.scene.save()

        del_ok_response = self.client.delete(url)
        self.assertEqual(del_ok_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WorkspaceNode.objects.filter(id=self.screenplay.id).exists())

    def test_compact_ranks_command(self):
        """Populates sibling nodes with long/fragmented rank strings, executes compact_ranks, and verifies relative order and normalized length."""
        parent = WorkspaceNode.objects.create(
            workspace=self.workspace,
            type="folder",
            title="Fragmented Ranks Folder",
            rank="0|h0:",
        )

        # Create sibling nodes with irregular/long rank strings
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

        # Execute compact_ranks command
        call_command("compact_ranks", workspace_id=str(self.workspace.id))

        # Re-fetch siblings ordered by compacted rank
        reordered_siblings = list(
            WorkspaceNode.objects.filter(parent=parent).order_by("rank")
        )
        actual_order_ids = [s.id for s in reordered_siblings]

        # Verify relative order is strictly preserved
        self.assertEqual(actual_order_ids, expected_order_ids)

        # Verify rank string length normalization
        for s in reordered_siblings:
            self.assertEqual(len(s.rank), 9)
            self.assertTrue(s.rank.startswith("0|h"))
            self.assertTrue(s.rank.endswith(":"))

        # Verify strict monotonicity
        ranks = [s.rank for s in reordered_siblings]
        self.assertEqual(ranks, sorted(ranks))

    def test_writer_cannot_toggle_lock(self):
        """Writer cannot toggle is_locked=True on an unlocked node."""
        self.scene.is_locked = False
        self.scene.save()

        self.client.force_authenticate(user=self.user_writer)
        url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        response = self.client.patch(url, {"is_locked": True}, format="json")
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])

        self.scene.refresh_from_db()
        self.assertFalse(self.scene.is_locked)

    def test_dept_head_can_create_script_notes(self):
        """Dept Head role is allowed to create and manage their own ScriptNotes."""
        self.client.force_authenticate(user=self.user_dept_head)
        url = reverse("scriptnote-list")

        payload = {
            "workspace": str(self.workspace.id),
            "node": str(self.scene.id),
            "author_name": "Camera Head",
            "author_role": "DEPT_HEAD",
            "category": "PRODUCTION",
            "text": "Requires 50mm anamorphic lens.",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ScriptNote.objects.count(), 1)

    def test_unauthenticated_request_defaults_to_read_only_actor(self):
        """Unauthenticated requests without membership default to ACTOR (read-only), returning 403 on mutations and 200 on safe GET."""
        self.client.logout()
        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})
        list_url = reverse("workspacenode-list")

        # 1. PATCH returns 403 Forbidden
        patch_res = self.client.patch(detail_url, {"content": "Unauthenticated hack"}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. POST returns 403 Forbidden
        post_res = self.client.post(list_url, {"workspace": str(self.workspace.id), "type": "scene", "title": "Hacked Scene", "rank": "0|h9:"}, format="json")
        self.assertEqual(post_res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. DELETE returns 403 Forbidden
        del_res = self.client.delete(detail_url)
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)

        # 4. GET safe method succeeds (200 OK)
        get_res = self.client.get(detail_url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)

    @override_settings(DEBUG=False)
    def test_header_spoofing_blocked_in_production(self):
        """When DEBUG=False, client cannot spoof X-Workspace-Role or X-User-Email headers to gain OWNER access."""
        self.client.logout()
        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        # Client attempts header spoofing
        response = self.client.patch(
            detail_url,
            {"content": "Spoofed owner write."},
            format="json",
            HTTP_X_WORKSPACE_ROLE="OWNER",
            HTTP_X_USER_EMAIL="owner@studio.com",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.scene.refresh_from_db()
        self.assertNotEqual(self.scene.content, "Spoofed owner write.")

    @override_settings(DEBUG=True)
    def test_header_override_allowed_in_debug_mode_only(self):
        """When DEBUG=True, X-Workspace-Role header is accepted for local developer perspective switching."""
        self.client.logout()
        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        response = self.client.patch(
            detail_url,
            {"content": "Authorized debug owner edit."},
            format="json",
            HTTP_X_WORKSPACE_ROLE="OWNER",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.scene.refresh_from_db()
        self.assertEqual(self.scene.content, "Authorized debug owner edit.")

    def test_delete_scheduled_scene_blocked(self):
        """Deleting a scene currently assigned to an active shooting day is rejected with HTTP 400."""
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

        self.client.force_authenticate(user=self.user_owner)
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
            author_name="Writer",
            text="Check pacing.",
        )

        self.client.force_authenticate(user=self.user_owner)
        detail_url = reverse("workspacenode-detail", kwargs={"pk": str(self.scene.id)})

        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(WorkspaceNode.objects.filter(id=self.scene.id).exists())
        self.assertFalse(WorkspaceNode.objects.filter(id=dialogue.id).exists())
        self.assertFalse(ShotBlockCoverage.objects.filter(id=coverage.id).exists())
        self.assertFalse(ScriptNote.objects.filter(id=note.id).exists())

        strip.refresh_from_db()
        self.assertIsNone(strip.scene)
