'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { WorkspaceSidebar } from './tree/WorkspaceSidebar';
import { NodeDispatcher } from './NodeDispatcher';
import { CommandPalette } from './navigation/CommandPalette';
import { TeamManagementModal } from './team/TeamManagementModal';
import { AlertCircle, RefreshCw, X, Shield, Users } from 'lucide-react';
import { WorkspaceRole } from '@/types/workspace';

interface WorkspaceShellProps {
  slug?: string;
}

const PERSPECTIVE_ROLES: { role: WorkspaceRole; label: string; icon: string; color: string }[] = [
  { role: 'OWNER', label: 'Executive', icon: '👑', color: 'text-amber-400' },
  { role: 'PRODUCER', label: 'Producer', icon: '💼', color: 'text-indigo-400' },
  { role: 'DIRECTOR', label: 'Director', icon: '🎬', color: 'text-sky-400' },
  { role: 'WRITER', label: 'Writer', icon: '✍️', color: 'text-emerald-400' },
  { role: 'DEPT_HEAD', label: 'Dept Head', icon: '🛠️', color: 'text-violet-400' },
  { role: 'ACTOR', label: 'Actor', icon: '🎭', color: 'text-rose-400' },
];

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
    setCurrentUserRole,
    loadCurrentUserRole,
  } = useWorkspaceStore();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  useEffect(() => {
    loadWorkspace(slug);
  }, [slug, loadWorkspace]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadCurrentUserRole(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadCurrentUserRole]);

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
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Connection Error</h2>
          <p className="text-xs text-slate-400">{error}</p>
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
        {/* Top Header Bar with Role Switcher Perspective */}
        <div className="h-9 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 flex items-center justify-between shrink-0 no-print z-20">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Role Perspective:</span>
            </span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {PERSPECTIVE_ROLES.map(({ role, label, icon, color }) => (
                <button
                  key={role}
                  onClick={() => setCurrentUserRole(role)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                    currentUserRole === role
                      ? 'bg-slate-800 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Preview workspace as ${label}`}
                >
                  <span>{icon}</span>
                  <span className={currentUserRole === role ? color : ''}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-[11px] text-slate-400">
              Active: <strong className="text-indigo-300 font-bold">{currentUserRole}</strong>
            </span>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] transition-colors"
              title="Manage team members and permissions"
            >
              <Users className="w-3 h-3" />
              <span>Team & Roles</span>
            </button>
          </div>
        </div>

        <NodeDispatcher />
      </main>

      {/* Global Universal Command Palette (CMD+K / Ctrl+K) */}
      <CommandPalette />

      {/* Team Management Modal */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        workspaceId={currentWorkspace?.id || ''}
        workspaceName={currentWorkspace?.name}
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
