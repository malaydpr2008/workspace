'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSidebar } from './tree/WorkspaceSidebar';
import { NodeDispatcher } from './NodeDispatcher';
import { CommandPalette } from './navigation/CommandPalette';
import { StudioActivityDrawer } from './activity/StudioActivityDrawer';
import { ProjectManagerModal } from './project/ProjectManagerModal';
import {
  AlertCircle,
  RefreshCw,
  X,
  Activity,
  Clapperboard,
  Film,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
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
    activeFilmSuite,
    setActiveFilmSuite,
    isProjectModalOpen,
    setIsProjectModalOpen,
  } = useWorkspaceStore();

  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const socketClientRef = useRef<WorkspaceSocketClient | null>(null);

  useEffect(() => {
    loadWorkspace(slug);
  }, [slug, loadWorkspace]);

  // Global Keyboard Shortcut: Ctrl+P / Cmd+P to toggle Project Manager
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsProjectModalOpen(!isProjectModalOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectModalOpen, setIsProjectModalOpen]);

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

  const isFilmProject = currentWorkspace?.project_type === 'film';

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar with Recursive Tree Navigation or Film Scene Spine */}
      <WorkspaceSidebar />

      {/* Central Canvas with Polymorphic Node Dispatcher */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-950">
        {/* Top Header Bar: Film Creative Suite Tabs or Live Sync Status */}
        <div className="h-11 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 flex items-center justify-between shrink-0 no-print z-20">
          {/* Left / Center: Film Studio Creative Suite Switcher Bar */}
          {isFilmProject ? (
            <div className="flex items-center space-x-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveFilmSuite('screenplay')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  activeFilmSuite === 'screenplay'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Screenplay Script Editor"
              >
                <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Screenplay</span>
              </button>

              <button
                onClick={() => setActiveFilmSuite('storyboard')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  activeFilmSuite === 'storyboard'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Camera Setups & Storyboard Coverage"
              >
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span>Storyboards & Shots</span>
              </button>

              <button
                onClick={() => setActiveFilmSuite('schedule')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  activeFilmSuite === 'schedule'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Stripboard Production Shooting Schedule"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Stripboard Schedule</span>
              </button>

              <button
                onClick={() => setActiveFilmSuite('budget')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  activeFilmSuite === 'budget'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Production Budget & Accounting Ledger"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Budget & Accounting</span>
              </button>

              <button
                onClick={() => setActiveFilmSuite('analytics')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  activeFilmSuite === 'analytics'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Studio Command Center Executive Analytics"
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>Analytics</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-300 font-mono font-medium">
                {currentWorkspace?.name || 'Studio Environment'}
              </span>
            </div>
          )}

          {/* Right Status Actions */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            {/* Live Sync Active Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync Active</span>
            </div>

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

      {/* Godot-Style Project Manager Modal (Ctrl+P / Cmd+P) */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

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
