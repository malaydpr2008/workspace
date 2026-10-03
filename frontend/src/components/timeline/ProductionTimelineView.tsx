'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  Edit2,
  X,
  Flag,
} from 'lucide-react';
import {
  WorkspaceNode,
  ProductionMilestone,
  ProductionPhase,
  MilestoneStatus,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ProductionTimelineViewProps {
  screenplayNode: WorkspaceNode;
  milestones: ProductionMilestone[];
  onSelectMilestone?: (milestone: ProductionMilestone) => void;
}

export const PHASE_CONFIG: Record<
  ProductionPhase,
  { label: string; icon: string; color: string; bg: string; border: string; barColor: string }
> = {
  DEVELOPMENT: {
    label: 'Development',
    icon: '📜',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    barColor: 'bg-amber-500',
  },
  PRE_PRODUCTION: {
    label: 'Pre-Production',
    icon: '📋',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    barColor: 'bg-violet-500',
  },
  PRODUCTION: {
    label: 'Principal Photography',
    icon: '🎬',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    barColor: 'bg-sky-500',
  },
  POST_PRODUCTION: {
    label: 'Post-Production',
    icon: '✂️',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    barColor: 'bg-emerald-500',
  },
  DELIVERY: {
    label: 'Delivery & Distribution',
    icon: '📦',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    barColor: 'bg-rose-500',
  },
};

export const STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PLANNED: {
    label: 'Planned',
    color: 'text-slate-400',
    bg: 'bg-slate-800/60',
    border: 'border-slate-700',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-sky-400',
    bg: 'bg-sky-500/20',
    border: 'border-sky-500/40',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
  },
  DELAYED: {
    label: 'Delayed',
    color: 'text-rose-400',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
  },
};

export const ProductionTimelineView: React.FC<ProductionTimelineViewProps> = ({
  screenplayNode,
  milestones,
}) => {
  const {
    currentWorkspace,
    createMilestoneItem,
    updateMilestoneItem,
    deleteMilestoneItem,
    initDefaultTimeline,
  } = useWorkspaceStore();

  const [isInitializing, setIsInitializing] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProductionMilestone | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add milestone form state
  const [newPhase, setNewPhase] = useState<ProductionPhase>('PRODUCTION');
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStatus, setNewStatus] = useState<MilestoneStatus>('PLANNED');
  const [newProgress, setNewProgress] = useState(0);
  const [newDepartment, setNewDepartment] = useState('CAMERA');

  // Edit milestone form state
  const [editTitle, setEditTitle] = useState('');
  const [editPhase, setEditPhase] = useState<ProductionPhase>('PRODUCTION');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState<MilestoneStatus>('IN_PROGRESS');
  const [editProgress, setEditProgress] = useState(0);
  const [editDepartment, setEditDepartment] = useState('');

  const handleInitDefault = async () => {
    if (!screenplayNode?.id) return;
    setIsInitializing(true);
    try {
      await initDefaultTimeline(screenplayNode.id, currentWorkspace?.id);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !screenplayNode?.id || !newTitle.trim()) return;

    await createMilestoneItem({
      workspace: currentWorkspace.id,
      screenplay: screenplayNode.id,
      phase: newPhase,
      title: newTitle.trim(),
      start_date: newStartDate || null,
      end_date: newEndDate || null,
      status: newStatus,
      progress_percentage: newProgress,
      department: newDepartment.trim().toUpperCase(),
      order: milestones.length + 1,
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewStartDate('');
    setNewEndDate('');
    setNewProgress(0);
  };

  const handleOpenEdit = (m: ProductionMilestone) => {
    setEditingMilestone(m);
    setEditTitle(m.title);
    setEditPhase(m.phase);
    setEditStartDate(m.start_date || '');
    setEditEndDate(m.end_date || '');
    setEditStatus(m.status);
    setEditProgress(m.progress_percentage);
    setEditDepartment(m.department || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;

    await updateMilestoneItem(editingMilestone.id, {
      title: editTitle.trim(),
      phase: editPhase,
      start_date: editStartDate || null,
      end_date: editEndDate || null,
      status: editStatus,
      progress_percentage: editProgress,
      department: editDepartment.trim().toUpperCase(),
    });

    setEditingMilestone(null);
  };

  // Group milestones by phase
  const phasesList: ProductionPhase[] = [
    'DEVELOPMENT',
    'PRE_PRODUCTION',
    'PRODUCTION',
    'POST_PRODUCTION',
    'DELIVERY',
  ];

  const milestonesByPhase = phasesList.reduce(
    (acc, phase) => {
      acc[phase] = milestones.filter((m) => m.phase === phase);
      return acc;
    },
    {} as Record<ProductionPhase, ProductionMilestone[]>
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
            Production Gantt Roadmap ({milestones.length} Milestones)
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {milestones.length === 0 ? (
            <button
              onClick={handleInitDefault}
              disabled={isInitializing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isInitializing ? 'Generating...' : 'Auto-Populate Film Timeline'}</span>
            </button>
          ) : (
            <button
              onClick={handleInitDefault}
              disabled={isInitializing}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700"
              title="Reset and reload default Hollywood milestones"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Re-Populate Defaults</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Milestone</span>
          </button>
        </div>
      </div>

      {/* Visual Gantt Phase Breakdown */}
      {milestones.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <Flag className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-mono text-slate-400">
            No milestones configured for this screenplay. Click &quot;Auto-Populate Film Timeline&quot; to initialize standard Hollywood production phases.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {phasesList.map((phaseKey) => {
            const phaseMilestones = milestonesByPhase[phaseKey] || [];
            const phaseConfig = PHASE_CONFIG[phaseKey];

            if (phaseMilestones.length === 0) return null;

            return (
              <div
                key={phaseKey}
                className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3 shadow-sm"
              >
                {/* Phase Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{phaseConfig.icon}</span>
                    <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${phaseConfig.color}`}>
                      {phaseConfig.label}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({phaseMilestones.length} item{phaseMilestones.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  {/* Phase Progress Average */}
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                    <span>Average Progress:</span>
                    <span className="font-bold text-white">
                      {Math.round(
                        phaseMilestones.reduce((acc, m) => acc + (m.progress_percentage || 0), 0) /
                          phaseMilestones.length
                      )}
                      %
                    </span>
                  </div>
                </div>

                {/* Milestones inside this phase */}
                <div className="space-y-3">
                  {phaseMilestones.map((m) => {
                    const statusInfo = STATUS_CONFIG[m.status] || STATUS_CONFIG.PLANNED;

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-xs font-mono font-bold text-white tracking-wide">
                              {m.title}
                            </span>
                            {m.department && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {m.department}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
                            >
                              {statusInfo.label}
                            </span>

                            {/* Actions */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 no-print transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Edit milestone dates & progress"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteMilestoneItem(m.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Delete milestone"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Dates & Visual Gantt Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>
                                {m.start_date ? m.start_date : 'TBD'} ➔ {m.end_date ? m.end_date : 'TBD'}
                              </span>
                            </div>
                            <span className="font-bold text-white">{m.progress_percentage}%</span>
                          </div>

                          {/* Progress bar container */}
                          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${phaseConfig.barColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, m.progress_percentage))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Milestone */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                <Flag className="w-4 h-4 text-cyan-400" />
                <span>Add Production Milestone</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Phase</label>
                <select
                  value={newPhase}
                  onChange={(e) => setNewPhase(e.target.value as ProductionPhase)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {phasesList.map((pk) => (
                    <option key={pk} value={pk}>
                      {PHASE_CONFIG[pk].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Cast Table Read & Rehearsals"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as MilestoneStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DELAYED">Delayed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProgress}
                    onChange={(e) => setNewProgress(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="CAMERA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Create Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Milestone */}
      {editingMilestone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <span>Edit Milestone</span>
              </h3>
              <button
                onClick={() => setEditingMilestone(null)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Phase</label>
                <select
                  value={editPhase}
                  onChange={(e) => setEditPhase(e.target.value as ProductionPhase)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {phasesList.map((pk) => (
                    <option key={pk} value={pk}>
                      {PHASE_CONFIG[pk].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as MilestoneStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DELAYED">Delayed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProgress}
                    onChange={(e) => setEditProgress(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMilestone(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
