'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clapperboard,
  Star,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Shot, WorkspaceNode, ProductionTake, TakeStatus } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface TakeLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: Shot | null;
  scene?: WorkspaceNode | null;
}

export const TakeLoggerModal: React.FC<TakeLoggerModalProps> = ({
  isOpen,
  onClose,
  shot,
  scene,
}) => {
  const {
    takesByShot,
    loadTakesForShot,
    createProductionTakeItem,
    toggleCircleTakeItem,
    deleteProductionTakeItem,
    currentWorkspace,
    currentUserRole,
    logStudioAction,
  } = useWorkspaceStore();

  // New Take Form State
  const [takeNumberOverride, setTakeNumberOverride] = useState<number | null>(null);
  const [status, setStatus] = useState<TakeStatus>('COMPLETE');
  const [cameraRoll, setCameraRoll] = useState('A01');
  const [soundRoll, setSoundRoll] = useState('SR01');
  const [duration, setDuration] = useState('5.0');
  const [notes, setNotes] = useState('');
  const [isCircleTake, setIsCircleTake] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const shotId = shot?.id;

  // Load takes for this shot
  useEffect(() => {
    if (isOpen && shotId) {
      loadTakesForShot(shotId);
    }
  }, [isOpen, shotId, loadTakesForShot]);

  const takes: ProductionTake[] = useMemo(() => {
    if (!shotId) return [];
    return takesByShot[shotId] || [];
  }, [shotId, takesByShot]);

  // Compute next suggested take number
  const nextTakeNumber = useMemo(() => {
    if (takes.length > 0) {
      return Math.max(...takes.map((t) => t.take_number)) + 1;
    }
    return 1;
  }, [takes]);

  const currentTakeNumber = takeNumberOverride ?? nextTakeNumber;

  // Metrics
  const metrics = useMemo(() => {
    const total = takes.length;
    const circleTakes = takes.filter((t) => t.is_circle_take);
    const totalSecs = takes.reduce((acc, t) => acc + (t.duration_seconds || 0), 0);
    const avgSecs = total > 0 ? (totalSecs / total).toFixed(1) : '0.0';
    return {
      total,
      circleTakeNumbers: circleTakes.map((t) => `Take ${t.take_number}`),
      avgDuration: avgSecs,
    };
  }, [takes]);

  const handleCreateTake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shot) return;

    setIsLogging(true);
    try {
      await createProductionTakeItem({
        shot: shot.id,
        take_number: currentTakeNumber,
        status,
        camera_roll: cameraRoll.trim() || 'A01',
        sound_roll: soundRoll.trim() || 'SR01',
        duration_seconds: parseFloat(duration) || 0.0,
        notes: notes.trim(),
        is_circle_take: isCircleTake,
      });

      if (currentWorkspace?.id) {
        logStudioAction({
          workspace: currentWorkspace.id,
          actor_name: currentUserRole === 'OWNER' ? 'Script Supervisor' : `${currentUserRole} Lead`,
          actor_role: currentUserRole,
          action_type: 'TAKE_LOGGED',
          department: 'PRODUCTION',
          description: `Logged Take ${currentTakeNumber}${isCircleTake ? ' ⭐ (Circle Take)' : ''} on Shot ${shot.shot_number} (${shot.shot_type || 'Standard'}) - ${scene?.title || 'Scene'}`,
          target_node: scene?.id || null,
        });
      }

      setTakeNumberOverride(null);
      setNotes('');
      setIsCircleTake(false);
    } catch (err) {
      console.error('Failed to create take', err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleToggleCircle = async (takeId: string) => {
    if (!shot) return;
    const targetTake = takes.find((t) => t.id === takeId);
    const willBeCircle = targetTake ? !targetTake.is_circle_take : true;
    await toggleCircleTakeItem(takeId, shot.id);

    if (currentWorkspace?.id) {
      logStudioAction({
        workspace: currentWorkspace.id,
        actor_name: currentUserRole === 'OWNER' ? 'Director' : `${currentUserRole} Lead`,
        actor_role: currentUserRole,
        action_type: 'TAKE_LOGGED',
        department: 'PRODUCTION',
        description: `${willBeCircle ? 'Starred' : 'Unstarred'} Circle Take ⭐ (Take ${targetTake?.take_number || ''}) on Shot ${shot.shot_number} (${shot.shot_type || 'Standard'}) - ${scene?.title || 'Scene'}`,
        target_node: scene?.id || null,
      });
    }
  };

  const handleDeleteTake = async (takeId: string) => {
    if (!shot) return;
    await deleteProductionTakeItem(takeId, shot.id);
  };

  if (!isOpen || !shot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Production Take Logger — Shot {shot.shot_number}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {shot.shot_type} • {shot.lens}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {scene ? scene.title : 'Active Scene'} • Script Supervisor Slates & Circle Takes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slate Metrics Summary Bar */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-500 uppercase text-[10px] mr-1">Total Takes:</span>
              <span className="font-bold text-white text-sm">{metrics.total}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 uppercase text-[10px]">Circle Takes:</span>
              {metrics.circleTakeNumbers.length > 0 ? (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center space-x-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{metrics.circleTakeNumbers.join(', ')}</span>
                </span>
              ) : (
                <span className="text-slate-400 italic">None selected yet</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] mr-1">Avg Duration:</span>
              <span className="text-cyan-300 font-bold">{metrics.avgDuration}s</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Click ⭐ to mark Circle Take for post-production</span>
          </div>
        </div>

        {/* Takes Recorded Table / Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {takes.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-800/80 rounded-2xl text-slate-500 space-y-2">
              <Clapperboard className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">
                No takes logged yet for Shot {shot.shot_number}.
              </p>
              <p className="text-xs text-slate-600">
                Record Take 1 below as soon as camera rolls are slated.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-lg bg-slate-900/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                    <th className="p-3 text-center w-14">Take</th>
                    <th className="p-3 text-center w-16">Circle</th>
                    <th className="p-3 text-center w-28">Status</th>
                    <th className="p-3 text-center w-20">Camera</th>
                    <th className="p-3 text-center w-20">Sound</th>
                    <th className="p-3 text-center w-24">Duration</th>
                    <th className="p-3">Director / Continuity Notes</th>
                    <th className="p-3 text-center w-12">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {takes.map((take) => (
                    <tr
                      key={take.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        take.is_circle_take ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Take Number */}
                      <td className="p-3 font-bold text-center text-white text-sm">
                        #{take.take_number}
                      </td>

                      {/* Circle Take Toggle Button */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleCircle(take.id)}
                          className={`p-1.5 rounded-lg transition-transform active:scale-125 ${
                            take.is_circle_take
                              ? 'text-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/20'
                              : 'text-slate-600 hover:text-amber-400/60'
                          }`}
                          title={
                            take.is_circle_take
                              ? 'Preferred Circle Take ⭐ (Click to unmark)'
                              : 'Mark as Circle Take ⭐'
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${
                              take.is_circle_take ? 'fill-amber-400' : ''
                            }`}
                          />
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {take.status === 'COMPLETE' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            <span>Complete</span>
                          </span>
                        ) : take.status === 'FALSE_START' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>False Start</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Incomplete</span>
                          </span>
                        )}
                      </td>

                      {/* Camera Roll */}
                      <td className="p-3 text-center text-slate-300 font-bold">
                        {take.camera_roll || '—'}
                      </td>

                      {/* Sound Roll */}
                      <td className="p-3 text-center text-slate-300 font-bold">
                        {take.sound_roll || '—'}
                      </td>

                      {/* Duration */}
                      <td className="p-3 text-center font-bold text-cyan-300">
                        {take.duration_seconds.toFixed(1)}s
                      </td>

                      {/* Notes */}
                      <td className="p-3 text-slate-200">
                        {take.notes ? (
                          <span className="leading-relaxed">{take.notes}</span>
                        ) : (
                          <span className="text-slate-600 italic">No notes</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteTake(take.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete take record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Log New Take Form */}
        <form
          onSubmit={handleCreateTake}
          className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-end gap-3 shrink-0"
        >
          <div className="w-20">
            <label className="block text-[10px] uppercase text-slate-400 mb-1">
              Take #
            </label>
            <input
              type="number"
              min="1"
              value={currentTakeNumber}
              onChange={(e) => setTakeNumberOverride(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500 text-center font-bold"
            />
          </div>

          <div className="w-36">
            <label className="block text-[10px] uppercase text-slate-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TakeStatus)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="COMPLETE">Complete</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="FALSE_START">False Start</option>
            </select>
          </div>

          <div className="w-24">
            <label className="block text-[10px] uppercase text-slate-400 mb-1">
              Cam Roll
            </label>
            <input
              type="text"
              value={cameraRoll}
              onChange={(e) => setCameraRoll(e.target.value)}
              placeholder="A01"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>

          <div className="w-24">
            <label className="block text-[10px] uppercase text-slate-400 mb-1">
              Sound Roll
            </label>
            <input
              type="text"
              value={soundRoll}
              onChange={(e) => setSoundRoll(e.target.value)}
              placeholder="SR01"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>

          <div className="w-24">
            <label className="block text-[10px] uppercase text-slate-400 mb-1">
              Duration (s)
            </label>
            <input
              type="number"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="5.0"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] uppercase text-slate-400 mb-1">
              Director / Continuity Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Great performance on line 2, boom shadow at end"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCircleTake}
                onChange={(e) => setIsCircleTake(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span className="text-[10px] text-amber-300 font-bold">Circle ⭐</span>
            </label>

            <button
              type="submit"
              disabled={isLogging}
              className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold transition-colors shadow-md shadow-amber-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Take</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
