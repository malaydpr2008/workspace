import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class WorkspaceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer handling real-time collaborator presence
    and workspace mutation broadcasting.
    """

    async def connect(self):
        self.workspace_id = self.scope.get("url_route", {}).get("kwargs", {}).get("workspace_id")
        if not self.workspace_id:
            await self.close()
            return

        self.room_group_name = f"workspace_{self.workspace_id}"
        self.user_id = None
        self.user_name = "Anonymous"
        self.user_role = "WRITER"

        # Join workspace room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

        # Send connection confirmation
        await self.send(
            text_data=json.dumps(
                {
                    "action": "connected",
                    "workspace_id": self.workspace_id,
                    "message": "Connected to workspace live broadcast room.",
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            # Broadcast user departure if user was identified
            if self.user_id:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "presence_leave",
                        "user_id": self.user_id,
                        "user_name": self.user_name,
                    },
                )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.warning("Invalid JSON received over websocket: %s", text_data)
            return

        action = data.get("action")

        if action == "presence_update":
            self.user_id = data.get("user_id", self.user_id)
            self.user_name = data.get("user_name", self.user_name)
            self.user_role = data.get("user_role", self.user_role)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "presence_message",
                    "user_id": self.user_id,
                    "user_name": self.user_name,
                    "user_role": self.user_role,
                    "focused_block_id": data.get("focused_block_id"),
                    "sender_channel": self.channel_name,
                    "timestamp": data.get("timestamp"),
                },
            )

        elif action == "broadcast_mutation":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "mutation_message",
                    "mutation_type": data.get("mutation_type"),
                    "payload": data.get("payload", {}),
                    "actor_name": data.get("actor_name", self.user_name),
                    "actor_role": data.get("actor_role", self.user_role),
                    "sender_channel": self.channel_name,
                    "timestamp": data.get("timestamp"),
                },
            )

        elif action == "ping":
            await self.send(text_data=json.dumps({"action": "pong"}))

    async def presence_message(self, event):
        # Relay presence update to connected client
        await self.send(
            text_data=json.dumps(
                {
                    "action": "presence_update",
                    "user_id": event["user_id"],
                    "user_name": event["user_name"],
                    "user_role": event["user_role"],
                    "focused_block_id": event.get("focused_block_id"),
                    "is_self": event.get("sender_channel") == self.channel_name,
                    "timestamp": event.get("timestamp"),
                }
            )
        )

    async def presence_leave(self, event):
        # Relay presence leave to connected client
        await self.send(
            text_data=json.dumps(
                {
                    "action": "presence_leave",
                    "user_id": event["user_id"],
                    "user_name": event["user_name"],
                }
            )
        )

    async def mutation_message(self, event):
        # Relay mutation event to connected client
        await self.send(
            text_data=json.dumps(
                {
                    "action": "broadcast_mutation",
                    "mutation_type": event["mutation_type"],
                    "payload": event["payload"],
                    "actor_name": event["actor_name"],
                    "actor_role": event["actor_role"],
                    "is_self": event.get("sender_channel") == self.channel_name,
                    "timestamp": event.get("timestamp"),
                }
            )
        )
