import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class WorkspaceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer handling real-time solo multi-tab state
    synchronization via broadcast_mutation.
    """

    async def connect(self):
        self.workspace_id = self.scope.get("url_route", {}).get("kwargs", {}).get("workspace_id")
        if not self.workspace_id:
            await self.close()
            return

        self.room_group_name = f"workspace_{self.workspace_id}"

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

        if action == "broadcast_mutation":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "mutation_message",
                    "mutation_type": data.get("mutation_type"),
                    "payload": data.get("payload", {}),
                    "actor_name": data.get("actor_name", "Solo Creator"),
                    "actor_role": data.get("actor_role", "OWNER"),
                    "sender_channel": self.channel_name,
                    "timestamp": data.get("timestamp"),
                },
            )

        elif action == "ping":
            await self.send(text_data=json.dumps({"action": "pong"}))

    async def mutation_message(self, event):
        # Relay mutation event to connected client
        await self.send(
            text_data=json.dumps(
                {
                    "action": "broadcast_mutation",
                    "mutation_type": event["mutation_type"],
                    "payload": event["payload"],
                    "actor_name": event.get("actor_name", "Solo Creator"),
                    "actor_role": event.get("actor_role", "OWNER"),
                    "is_self": event.get("sender_channel") == self.channel_name,
                    "timestamp": event.get("timestamp"),
                }
            )
        )

