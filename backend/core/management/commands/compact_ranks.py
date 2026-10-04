from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import WorkspaceNode


def int_to_base36(n: int, width: int = 6) -> str:
    """Encodes a positive integer into a zero-padded base36 string of given width."""
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    res = []
    while n > 0:
        n, rem = divmod(n, 36)
        res.append(digits[rem])
    return "".join(reversed(res or ["0"])).zfill(width)


class Command(BaseCommand):
    help = "Normalize and compact fractional LexoRank strings across sibling WorkspaceNode records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--workspace_id",
            type=str,
            default=None,
            help="Optional UUID of a specific workspace to compact ranks for.",
        )

    def handle(self, *args, **options):
        workspace_id = options.get("workspace_id")

        qs = WorkspaceNode.objects.all()
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)

        # Retrieve distinct (workspace_id, parent_id) pairs
        sibling_groups = (
            qs.values_list("workspace_id", "parent_id")
            .distinct()
            .order_by("workspace_id", "parent_id")
        )

        base_val = int("h00000", 36)  # Standard LexoRank midpoint baseline
        step = 10000

        total_groups = 0
        total_nodes = 0

        with transaction.atomic():
            for ws_id, p_id in sibling_groups:
                siblings_qs = WorkspaceNode.objects.filter(
                    workspace_id=ws_id, parent_id=p_id
                ).order_by("rank", "created_at", "id")

                siblings = list(siblings_qs)
                if not siblings:
                    continue

                updated_siblings = []
                for index, node in enumerate(siblings):
                    normalized_rank = f"0|{int_to_base36(base_val + (index + 1) * step)}:"
                    if node.rank != normalized_rank:
                        node.rank = normalized_rank
                        updated_siblings.append(node)

                if updated_siblings:
                    WorkspaceNode.objects.bulk_update(updated_siblings, ["rank"])

                total_groups += 1
                total_nodes += len(siblings)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully compacted {total_groups} sibling groups and {total_nodes} nodes."
            )
        )
