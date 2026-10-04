'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSidebar } from './tree/WorkspaceSidebar';
import { NodeDispatcher } from './NodeDispatcher';
import { CommandPalette } from './navigation/CommandPalette';
import { StudioActivityDrawer } from './activity/StudioActivityDrawer';
import { AlertCircle, RefreshCw, X, Shield, Activity } from 'lucide-react';
import { WorkspaceRole, WorkspaceNode } from '@/types/workspace';
import { createWorkspaceSocket, WorkspaceSocketClient } from '@/lib/websocket';

interface WorkspaceShellProps {
  slug?: string;
}



function getRoleAvatarStyle(role: WorkspaceRole) {
  switch (role) {
    case 'OWNER':
      return { ring: 'ring-amber-500/70 text-amber-300 bg-amber-950/80', icon: '👑' };
    case 'PRODUCER':
      return { ring: 'ring-indigo-500/70 text-indigo-300 bg-indigo-950/80', icon: '💼' };
    case 'DIRECTOR':
      return { ring: 'ring-sky-500/70 text-sky-300 bg-sky-950/80', icon: '🎬' };
    case 'WRITER':
      return { ring: 'ring-emerald-500/70 text-emerald-300 bg-emerald-950/80', icon: '✍️' };
    case 'DEPT_HEAD':
      return { ring: 'ring-violet-500/70 text-violet-300 bg-violet-950/80', icon: '🛠️' };
    case 'ACTOR':
      return { ring: 'ring-rose-500/70 text-rose-300 bg-rose-950/80', icon: '🎭' };
    default:
      return { ring: 'ring-slate-600 text-slate-300 bg-slate-900', icon: '👤' };
  }
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  slug = 'production-studio',
}) => {
  const {
    loadWorkspace,
    error,
    currentWorkspace,
    lastError,
    clearLastError,
    currentUserRole,
    loadCurrentUserRole,
    collaborators,
    updateCollaboratorPresence,
    removeCollaborator,
    selectedNodeId,
    selectNode,
    nodes,
    applyRemoteNodeMutation,
  } = useWorkspaceStore();

  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const socketClientRef = useRef<WorkspaceSocketClient | null>(null);
  const localUserIdRef = useRef<string>('usr-collab-lead');

  useEffect(() => {
    loadWorkspace(slug);
  }, [slug, loadWorkspace]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadCurrentUserRole(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadCurrentUserRole]);

  // Real-time WebSocket Presence & Live Sync
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const wsClient = createWorkspaceSocket(currentWorkspace.id, (event) => {
      if (event.action === 'presence_update') {
        if (!event.is_self && event.user_id) {
          updateCollaboratorPresence({
            userId: event.user_id,
            userName: event.user_name || 'Collaborator',
            userRole: (event.user_role as WorkspaceRole) || 'WRITER',
            focusedBlockId: event.focused_block_id,
            lastSeen: Date.now(),
          });
        }
      } else if (event.action === 'presence_leave') {
        if (event.user_id) {
          removeCollaborator(event.user_id);
        }
      } else if (event.action === 'broadcast_mutation') {
        if (!event.is_self && event.payload) {
          const payload = event.payload as Partial<WorkspaceNode> & { id: string };
          if (payload && payload.id) {
            applyRemoteNodeMutation(payload);
          }
        }
      }
    });

    socketClientRef.current = wsClient;

    // Send initial presence
    wsClient.sendPresence({
      userId: localUserIdRef.current,
      userName: 'Solo Creator',
      userRole: currentUserRole || 'OWNER',
      focusedBlockId: selectedNodeId,
    });

    // Periodic heartbeat presence broadcast
    const presenceTimer = setInterval(() => {
      wsClient.sendPresence({
        userId: localUserIdRef.current,
        userName: 'Solo Creator',
        userRole: currentUserRole || 'OWNER',
        focusedBlockId: selectedNodeId,
      });
    }, 15000);

    return () => {
      clearInterval(presenceTimer);
      wsClient.disconnect();
      socketClientRef.current = null;
    };
  }, [
    currentWorkspace?.id,
    currentUserRole,
    selectedNodeId,
    updateCollaboratorPresence,
    removeCollaborator,
    applyRemoteNodeMutation,
  ]);

  // Auto-dismiss lastError after 6 seconds
  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => {
        clearLastError();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [lastError, clearLastError]);

  if (error && !currentWorkspace) {
    const displayError = (() => {
      if (!error) return 'Unable to connect to studio workspace.';
      if (
        error.includes('{"children":') ||
        error.includes('<!DOCTYPE') ||
        error.includes('<html') ||
        error.includes('This page could not be found')
      ) {
        return 'Backend endpoint unreachable or returned an invalid page (404).';
      }
      return error;
    })();

    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Connection Error</h2>
          <p className="text-xs text-slate-400">{displayError}</p>
          <p className="text-[11px] text-slate-500">
            Make sure the Django backend is running at{' '}
            <code className="text-cyan-400 font-mono">http://localhost:8000</code> and seeded.
          </p>
          <button
            onClick={() => loadWorkspace(slug)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar with Recursive Tree Navigation */}
      <WorkspaceSidebar />

      {/* Central Canvas with Polymorphic Node Dispatcher */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-950">
        {/* Top Header Bar with Solo Studio Badge & Real-Time Presence */}
        <div className="h-9 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 flex items-center justify-between shrink-0 no-print z-20">
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide">Studio Solo Mode</span>
            </div>

            {/* Collaborator Live Presence Avatars */}
            {collaborators.length > 0 && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                <div className="flex items-center -space-x-1.5">
                  {collaborators.map((c) => {
                    const roleStyle = getRoleAvatarStyle(c.userRole);
                    const initial = (c.userName || 'C').charAt(0).toUpperCase();
                    const targetNode = c.focusedBlockId ? nodes[c.focusedBlockId] : null;
                    const tooltip = `${c.userName} (${c.userRole})${
                      targetNode ? ` • Focused on ${targetNode.title || targetNode.type}` : ' • In workspace'
                    }`;
                    return (
                      <div
                        key={c.userId}
                        title={tooltip}
                        className={`relative inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ring-1.5 ${roleStyle.ring} cursor-pointer hover:scale-110 hover:z-10 transition-transform`}
                      >
                        <span>{initial}</span>
                        <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-slate-900" />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {collaborators.length} Peer{collaborators.length === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            {/* Studio Activity Stream & Audit Log Drawer Toggle */}
            <button
              onClick={() => setIsActivityDrawerOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition-colors"
              title="View live studio activity audit stream"
            >
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>Activity</span>
            </button>
          </div>
        </div>

        <NodeDispatcher />
      </main>

      {/* Global Universal Command Palette (CMD+K / Ctrl+K) */}
      <CommandPalette />



      {/* Studio Activity Stream & Audit Log Drawer */}
      <StudioActivityDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
        onSelectNode={(nodeId) => selectNode(nodeId)}
      />

      {/* Non-intrusive Floating Sync Error Banner / Toast */}
      {lastError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-rose-500/40 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-semibold text-rose-300">Sync Failure</div>
            <div className="text-slate-400 mt-0.5">{lastError}</div>
          </div>
          <button
            onClick={clearLastError}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
