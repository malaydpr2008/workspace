'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  Film,
  Lock,
  MessageSquare,
  CheckCircle,
  Video,
  DollarSign,
  UserPlus,
  Clock,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ActivityDepartment, StudioActivityLog } from '@/types/workspace';

interface StudioActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
}

const DEPARTMENTS: { id: ActivityDepartment; label: string; color: string }[] = [
  { id: 'ALL', label: 'All Depts', color: 'border-neutral-700 text-neutral-300' },
  { id: 'SCRIPT', label: 'Script', color: 'border-emerald-500/40 text-emerald-400' },
  { id: 'BUDGET', label: 'Budget', color: 'border-indigo-500/40 text-indigo-400' },
  { id: 'PRODUCTION', label: 'Production', color: 'border-sky-500/40 text-sky-400' },
  { id: 'LEGAL', label: 'Legal', color: 'border-rose-500/40 text-rose-400' },
  { id: 'SOUND', label: 'Sound', color: 'border-purple-500/40 text-purple-400' },
];

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'SCRIPT_EDIT':
      return <Film className="w-3.5 h-3.5 text-emerald-400" />;
    case 'SCENE_LOCK':
      return <Lock className="w-3.5 h-3.5 text-amber-400" />;
    case 'NOTE_ADDED':
      return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />;
    case 'NOTE_RESOLVED':
      return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    case 'TAKE_LOGGED':
      return <Video className="w-3.5 h-3.5 text-sky-400" />;
    case 'BUDGET_UPDATE':
      return <DollarSign className="w-3.5 h-3.5 text-indigo-400" />;
    case 'MEMBER_INVITED':
      return <UserPlus className="w-3.5 h-3.5 text-violet-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-neutral-400" />;
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'OWNER':
      return { label: '👑 Owner', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    case 'PRODUCER':
      return { label: '💼 Producer', badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' };
    case 'DIRECTOR':
      return { label: '🎬 Director', badge: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
    case 'WRITER':
      return { label: '✍️ Writer', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    case 'DEPT_HEAD':
      return { label: '🛠️ Dept Head', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/30' };
    case 'ACTOR':
      return { label: '🎭 Actor', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
    default:
      return { label: role, badge: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
  }
}

export function StudioActivityDrawer({
  isOpen,
  onClose,
  onSelectNode,
}: StudioActivityDrawerProps) {
  const { currentWorkspace, activityLogs, loadActivityLogs } = useWorkspaceStore();
  const [selectedDept, setSelectedDept] = useState<ActivityDepartment>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen && currentWorkspace?.id) {
      loadActivityLogs(
        currentWorkspace.id,
        selectedDept === 'ALL' ? undefined : selectedDept
      );
    }
  }, [isOpen, currentWorkspace?.id, selectedDept, loadActivityLogs]);

  const handleRefresh = async () => {
    if (!currentWorkspace?.id) return;
    setIsRefreshing(true);
    await loadActivityLogs(
      currentWorkspace.id,
      selectedDept === 'ALL' ? undefined : selectedDept
    );
    setIsRefreshing(false);
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log: StudioActivityLog) => {
      const matchesDept = selectedDept === 'ALL' || log.department.toUpperCase() === selectedDept;
      if (!matchesDept) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.actor_name.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.action_type.toLowerCase().includes(q) ||
        (log.target_node_title && log.target_node_title.toLowerCase().includes(q))
      );
    });
  }, [activityLogs, selectedDept, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                Studio Activity Feed
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {filteredLogs.length} events
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Live audit trail across script, production, sound & budget
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Activity Log"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-neutral-800/80 bg-neutral-950/40 space-y-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search actions, crew, scene names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Department Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DEPARTMENTS.map((dept) => {
              const active = selectedDept === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap border transition ${
                    active
                      ? 'bg-neutral-100 text-neutral-950 border-neutral-100 font-semibold shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <Activity className="w-10 h-10 stroke-[1.2] mb-2 opacity-40" />
              <p className="text-sm font-medium text-neutral-400">No activity recorded yet</p>
              <p className="text-xs text-neutral-600 mt-1 max-w-xs">
                Production actions like scene number locking, note resolution, budget edits, and take logging will stream here in real time.
              </p>
            </div>
          ) : (
            filteredLogs.map((log: StudioActivityLog) => {
              const roleMeta = getRoleBadge(log.actor_role);
              return (
                <div
                  key={log.id}
                  className="group relative bg-neutral-900/60 hover:bg-neutral-850/80 border border-neutral-800/80 hover:border-neutral-700 rounded-lg p-3 transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1 rounded bg-neutral-800 border border-neutral-700/60">
                        {getActionIcon(log.action_type)}
                      </div>
                      <span className="text-xs font-semibold text-neutral-200">
                        {log.actor_name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleMeta.badge}`}
                      >
                        {roleMeta.label}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                        {log.department}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3 text-neutral-600" />
                      {formatTimeAgo(log.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 pl-7 leading-relaxed">
                    {log.description}
                  </p>

                  {/* Target Node Attachment */}
                  {log.target_node && onSelectNode && (
                    <div className="mt-2 pl-7 flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (log.target_node) {
                            onSelectNode(log.target_node);
                            onClose();
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Jump to {log.target_node_title || 'Target Scene'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/80 text-[11px] text-neutral-500 flex items-center justify-between">
          <span>Encrypted Studio Audit Stream</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </div>
      </div>
    </div>
  );
}
