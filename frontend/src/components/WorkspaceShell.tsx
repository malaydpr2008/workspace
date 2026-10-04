'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSidebar } from './tree/WorkspaceSidebar';
import { NodeDispatcher } from './NodeDispatcher';
import { CommandPalette } from './navigation/CommandPalette';
import { StudioActivityDrawer } from './activity/StudioActivityDrawer';
import { AlertCircle, RefreshCw, X, Activity } from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { createWorkspaceSocket, WorkspaceSocketClient } from '@/lib/websocket';

interface WorkspaceShellProps {
  slug?: string;
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
    selectNode,
    applyRemoteNodeMutation,
  } = useWorkspaceStore();

  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const socketClientRef = useRef<WorkspaceSocketClient | null>(null);

  useEffect(() => {
    loadWorkspace(slug);
  }, [slug, loadWorkspace]);

  // Real-time WebSocket Live Sync (Multi-tab Solo Mode)
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const wsClient = createWorkspaceSocket(currentWorkspace.id, (event) => {
      if (event.action === 'broadcast_mutation') {
        if (!event.is_self && event.payload) {
          const payload = event.payload as Partial<WorkspaceNode> & { id: string };
          if (payload && payload.id) {
            applyRemoteNodeMutation(payload);
          }
        }
      }
    });

    socketClientRef.current = wsClient;

    return () => {
      wsClient.disconnect();
      socketClientRef.current = null;
    };
  }, [currentWorkspace?.id, applyRemoteNodeMutation]);

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
        {/* Top Header Bar with Live Sync Status */}
        <div className="h-9 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 flex items-center justify-between shrink-0 no-print z-20">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-mono">Live Sync Active</span>
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
