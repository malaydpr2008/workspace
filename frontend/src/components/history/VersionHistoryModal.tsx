'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  X,
  Plus,
  RotateCcw,
  Check,
  AlertTriangle,
  GitCommit,
  Clock,
  Columns,
  List,
} from 'lucide-react';
import { WorkspaceNode, DocumentSnapshot, RevisionColor } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { computeScriptDiff, DiffItem } from '@/lib/diff';
import { REVISION_COLORS, getRevisionConfig } from '@/lib/revision';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenplayNode: WorkspaceNode;
  currentNodes: WorkspaceNode[];
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  screenplayNode,
  currentNodes,
}) => {
  const {
    snapshots,
    loadSnapshots,
    saveDraftSnapshot,
    restoreDraftSnapshot,
  } = useWorkspaceStore();

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
  const [onlyChanges, setOnlyChanges] = useState(false);

  // New snapshot creation form state
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState<RevisionColor>(
    screenplayNode.revision_color || 'WHITE'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Restore state
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && screenplayNode.id) {
      loadSnapshots(screenplayNode.id);
    }
  }, [isOpen, screenplayNode.id, loadSnapshots]);


  const selectedSnapshot: DocumentSnapshot | null = useMemo(() => {
    if (!selectedSnapshotId) return snapshots[0] || null;
    return snapshots.find((s) => s.id === selectedSnapshotId) || null;
  }, [snapshots, selectedSnapshotId]);

  // Extract snapshot subtree nodes
  const snapshotNodes: WorkspaceNode[] = useMemo(() => {
    if (!selectedSnapshot?.snapshot_data) return [];
    const data = selectedSnapshot.snapshot_data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.nodes)) return data.nodes;
    return [];
  }, [selectedSnapshot]);

  // Compute diff between active currentNodes and selected snapshot
  const diffSummary = useMemo(() => {
    return computeScriptDiff(currentNodes, snapshotNodes);
  }, [currentNodes, snapshotNodes]);

  const displayedDiffItems = useMemo(() => {
    if (!onlyChanges) return diffSummary.items;
    return diffSummary.items.filter((item) => item.status !== 'unchanged');
  }, [diffSummary.items, onlyChanges]);

  // Handlers
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setIsSaving(true);
    try {
      const created = await saveDraftSnapshot(
        screenplayNode.id,
        newLabel.trim(),
        newColor
      );
      if (created) {
        setSelectedSnapshotId(created.id);
        setNewLabel('');
        setIsCreatingSnapshot(false);
      }
    } catch (err) {
      console.error('Failed to create snapshot', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot) return;
    setIsRestoring(true);
    try {
      const success = await restoreDraftSnapshot(selectedSnapshot.id, screenplayNode.id);
      if (success) {
        setConfirmRestore(false);
        onClose();
      }
    } catch (err) {
      console.error('Failed to restore snapshot', err);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white font-mono">
                  Draft Version History & Visual Diff
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {screenplayNode.title || 'Screenplay'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compare revisions, audit modifications, and restore immutable historical drafts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle: Unified vs Split */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setDiffViewMode('unified')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  diffViewMode === 'unified'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Unified vertical diff stream"
              >
                <List className="w-3.5 h-3.5" />
                <span>Unified</span>
              </button>
              <button
                onClick={() => setDiffViewMode('split')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  diffViewMode === 'split'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Side-by-side split diff comparison"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
            </div>

            {/* Filter Toggle: Only Changes */}
            <button
              onClick={() => setOnlyChanges(!onlyChanges)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                onlyChanges
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {onlyChanges ? 'Showing Changes Only' : 'Show Full Script'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Sidebar + Right Diff Canvas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Snapshots List */}
          <div className="w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
            {/* Create Snapshot Trigger Bar */}
            <div className="p-4 border-b border-slate-800/80">
              <button
                onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold transition-colors shadow-md shadow-cyan-950/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save New Draft Snapshot</span>
              </button>

              {isCreatingSnapshot && (
                <form
                  onSubmit={handleCreateSnapshot}
                  className="mt-3 p-3 bg-slate-900 border border-slate-700/80 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                      Draft Label / Note
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Table Read Polish"
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                      Revision Color
                    </label>
                    <select
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value as RevisionColor)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    >
                      {REVISION_COLORS.map((rev) => (
                        <option key={rev.id} value={rev.id}>
                          {rev.draftName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSaving || !newLabel.trim()}
                      className="flex-1 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-mono font-medium transition-colors"
                    >
                      {isSaving ? 'Freezing...' : 'Create Snapshot'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingSnapshot(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white text-xs font-mono transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Snapshots Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {snapshots.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  <GitCommit className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  No snapshots frozen yet. Click above to save the current draft state.
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.id === snap.id;
                  const revConfig = getRevisionConfig(snap.revision_color);
                  const nodeCount = Array.isArray(snap.snapshot_data?.nodes)
                    ? snap.snapshot_data.nodes.length
                    : 0;

                  return (
                    <div
                      key={snap.id}
                      onClick={() => {
                        setSelectedSnapshotId(snap.id);
                        setConfirmRestore(false);
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${revConfig.badgeBg}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: revConfig.hex }}
                          />
                          <span>{revConfig.label}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(snap.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-white font-mono truncate">
                        {snap.label}
                      </h4>

                      <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                        <span>{nodeCount} script elements</span>
                        {isSelected && (
                          <span className="text-cyan-400 font-bold">Comparing</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Canvas: Diff View & Comparison */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Canvas Header / Comparison Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="text-slate-400">Comparing Snapshot:</span>
                    <span className="font-bold text-white">
                      {selectedSnapshot ? selectedSnapshot.label : 'None'}
                    </span>
                    <span className="text-slate-500">↔</span>
                    <span className="text-cyan-300 font-bold">Active Working Draft</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] font-mono mt-1">
                    <span className="text-emerald-400 font-semibold">
                      +{diffSummary.addedCount} Added
                    </span>
                    <span className="text-rose-400 font-semibold">
                      -{diffSummary.removedCount} Removed
                    </span>
                    <span className="text-amber-400 font-semibold">
                      ~{diffSummary.modifiedCount} Modified
                    </span>
                    <span className="text-slate-500">
                      ={diffSummary.unchangedCount} Unchanged
                    </span>
                  </div>
                </div>
              </div>

              {/* Restore Action */}
              {selectedSnapshot && (
                <div className="flex items-center space-x-2">
                  {confirmRestore ? (
                    <div className="flex items-center space-x-2 animate-in fade-in duration-100">
                      <span className="text-xs font-mono text-amber-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Confirm overwrite?</span>
                      </span>
                      <button
                        onClick={handleRestore}
                        disabled={isRestoring}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-mono font-bold transition-colors"
                      >
                        {isRestoring ? 'Restoring...' : 'Yes, Restore'}
                      </button>
                      <button
                        onClick={() => setConfirmRestore(false)}
                        className="px-2 py-1 text-slate-400 hover:text-white text-xs font-mono"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRestore(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono font-medium transition-colors"
                      title="Revert the active working script to match this snapshot draft"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restore This Draft</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Diff Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {displayedDiffItems.length === 0 ? (
                <div className="p-16 text-center text-slate-500 font-mono text-xs">
                  <Check className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                  No changes detected between this snapshot and the active script!
                </div>
              ) : diffViewMode === 'unified' ? (
                /* Unified Stream */
                <div className="space-y-3 max-w-4xl mx-auto">
                  {displayedDiffItems.map((item) => (
                    <UnifiedDiffRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                /* Side-by-Side Split Stream */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <div>Snapshot: {selectedSnapshot?.label}</div>
                    <div>Active Script</div>
                  </div>
                  {displayedDiffItems.map((item) => (
                    <SplitDiffRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Unified Diff Row Component */
const UnifiedDiffRow: React.FC<{ item: DiffItem }> = ({ item }) => {
  const isScene = item.type === 'scene';
  const isDialogue = item.type === 'dialogue';

  const badgeConfig = {
    added: {
      bg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100',
      label: '+ ADDED',
      labelColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
    },
    removed: {
      bg: 'bg-rose-950/40 border-rose-500/50 text-rose-200 line-through opacity-75',
      label: '- REMOVED',
      labelColor: 'text-rose-400 bg-rose-500/20 border-rose-500/40',
    },
    modified: {
      bg: 'bg-amber-950/30 border-amber-500/50 text-amber-100',
      label: '~ MODIFIED',
      labelColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
    },
    unchanged: {
      bg: 'bg-slate-900/30 border-slate-800 text-slate-300',
      label: 'UNCHANGED',
      labelColor: 'text-slate-500 bg-slate-800 border-slate-700',
    },
  }[item.status];

  return (
    <div
      className={`p-4 rounded-xl border font-mono text-xs leading-relaxed transition-colors ${badgeConfig.bg}`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-2 font-sans border-b border-white/5 pb-1.5">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-400">{item.type}</span>
          {item.sceneNumber && (
            <span className="text-cyan-400 font-bold">Scene {item.sceneNumber}</span>
          )}
        </div>
        <span
          className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${badgeConfig.labelColor}`}
        >
          {badgeConfig.label}
        </span>
      </div>

      {isScene ? (
        <div className="font-bold text-sm uppercase text-slate-100">
          {item.status === 'modified' && item.oldTitle ? (
            <div className="space-y-1">
              <div className="text-rose-400 line-through opacity-70">
                {item.oldTitle}
              </div>
              <div className="text-emerald-300">{item.title}</div>
            </div>
          ) : (
            item.title
          )}
        </div>
      ) : isDialogue ? (
        <div className="space-y-1 text-center max-w-lg mx-auto">
          <div className="font-bold uppercase tracking-wider text-cyan-300">
            {item.characterName || 'CHARACTER'}
          </div>
          {item.parenthetical && (
            <div className="italic text-slate-400 text-[11px]">
              ({item.parenthetical})
            </div>
          )}
          {item.status === 'modified' && item.oldContent ? (
            <div className="space-y-1 text-left">
              <div className="text-rose-300 line-through opacity-70 bg-rose-950/30 p-2 rounded">
                {item.oldContent}
              </div>
              <div className="text-emerald-200 bg-emerald-950/30 p-2 rounded">
                {item.content}
              </div>
            </div>
          ) : (
            <div className="text-slate-200 text-center">{item.content}</div>
          )}
        </div>
      ) : (
        /* Action Block */
        <div>
          {item.status === 'modified' && item.oldContent ? (
            <div className="space-y-1">
              <div className="text-rose-300 line-through opacity-70 bg-rose-950/30 p-2 rounded">
                {item.oldContent}
              </div>
              <div className="text-emerald-200 bg-emerald-950/30 p-2 rounded">
                {item.content}
              </div>
            </div>
          ) : (
            <div>{item.content}</div>
          )}
        </div>
      )}
    </div>
  );
};

/* Side-by-Side Split Diff Row Component */
const SplitDiffRow: React.FC<{ item: DiffItem }> = ({ item }) => {
  const isScene = item.type === 'scene';
  const isDialogue = item.type === 'dialogue';

  const leftContent =
    item.status === 'added' ? null : item.status === 'modified' && item.oldContent
      ? item.oldContent
      : item.content;

  const leftTitle =
    item.status === 'added' ? null : item.status === 'modified' && item.oldTitle
      ? item.oldTitle
      : item.title;

  const rightContent =
    item.status === 'removed' ? null : item.content;

  const rightTitle =
    item.status === 'removed' ? null : item.title;

  return (
    <div className="grid grid-cols-2 gap-4 font-mono text-xs">
      {/* Left: Snapshot Version */}
      <div
        className={`p-3 rounded-lg border leading-relaxed ${
          item.status === 'removed' || item.status === 'modified'
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            : item.status === 'added'
            ? 'bg-slate-950 border-slate-900 opacity-20'
            : 'bg-slate-900/40 border-slate-800 text-slate-300'
        }`}
      >
        {isScene ? (
          <div className="font-bold uppercase">{leftTitle || '—'}</div>
        ) : isDialogue ? (
          <div>
            <div className="font-bold uppercase text-cyan-400 text-center mb-1">
              {item.oldCharacterName || item.characterName}
            </div>
            <div className="text-center">{leftContent || '—'}</div>
          </div>
        ) : (
          <div>{leftContent || '—'}</div>
        )}
      </div>

      {/* Right: Active Version */}
      <div
        className={`p-3 rounded-lg border leading-relaxed ${
          item.status === 'added' || item.status === 'modified'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
            : item.status === 'removed'
            ? 'bg-slate-950 border-slate-900 opacity-20'
            : 'bg-slate-900/40 border-slate-800 text-slate-300'
        }`}
      >
        {isScene ? (
          <div className="font-bold uppercase">{rightTitle || '—'}</div>
        ) : isDialogue ? (
          <div>
            <div className="font-bold uppercase text-cyan-400 text-center mb-1">
              {item.characterName}
            </div>
            <div className="text-center">{rightContent || '—'}</div>
          </div>
        ) : (
          <div>{rightContent || '—'}</div>
        )}
      </div>
    </div>
  );
};
