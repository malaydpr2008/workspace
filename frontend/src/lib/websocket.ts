export interface WebSocketEvent {
  action: 'connected' | 'presence_update' | 'presence_leave' | 'broadcast_mutation' | 'pong';
  user_id?: string;
  user_name?: string;
  user_role?: string;
  focused_block_id?: string | null;
  is_self?: boolean;
  mutation_type?: string;
  payload?: unknown;
  actor_name?: string;
  actor_role?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface WorkspaceSocketClient {
  sendPresence: (params: {
    userId: string;
    userName: string;
    userRole: string;
    focusedBlockId?: string | null;
  }) => void;
  sendMutation: (
    mutationType: string,
    payload: unknown,
    actorName: string,
    actorRole: string
  ) => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

export function createWorkspaceSocket(
  workspaceId: string,
  onEvent: (event: WebSocketEvent) => void
): WorkspaceSocketClient {
  let socket: WebSocket | null = null;
  let isClosedManually = false;
  let reconnectAttempts = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  function getSocketUrl(): string {
    if (typeof window === 'undefined') return '';
    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    if (envWs) {
      return `${envWs.replace(/\/$/, '')}/ws/workspace/${workspaceId}/`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In standalone local dev on port 3000, fallback to direct Daphne port 8000.
    // Otherwise use window.location.host so Nginx gateway routes /ws/ to Daphne.
    const host = window.location.port === '3000' ? 'localhost:8000' : window.location.host;
    return `${protocol}//${host}/ws/workspace/${workspaceId}/`;
  }

  function connect() {
    if (isClosedManually) return;
    const url = getSocketUrl();
    if (!url) return;

    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        reconnectAttempts = 0;
        // Start ping heartbeat
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent(parsed);
        } catch {
          // ignore non-json
        }
      };

      socket.onerror = () => {
        // Handled in onclose
      };

      socket.onclose = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (!isClosedManually) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
          reconnectAttempts += 1;
          reconnectTimer = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch {
      // Reconnect after error
      if (!isClosedManually) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return {
    sendPresence: ({ userId, userName, userRole, focusedBlockId }) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            action: 'presence_update',
            user_id: userId,
            user_name: userName,
            user_role: userRole,
            focused_block_id: focusedBlockId ?? null,
            timestamp: new Date().toISOString(),
          })
        );
      }
    },
    sendMutation: (mutationType, payload, actorName, actorRole) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            action: 'broadcast_mutation',
            mutation_type: mutationType,
            payload,
            actor_name: actorName,
            actor_role: actorRole,
            timestamp: new Date().toISOString(),
          })
        );
      }
    },
    disconnect: () => {
      isClosedManually = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.close();
        socket = null;
      }
    },
    isConnected: () => socket !== null && socket.readyState === WebSocket.OPEN,
  };
}
