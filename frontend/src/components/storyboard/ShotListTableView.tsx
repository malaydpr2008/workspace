'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Camera,
  Clock,
  Film,
  Plus,
  Trash2,
  Upload,
  Play,
  Link as LinkIcon,
  Printer,
} from 'lucide-react';
import { WorkspaceNode, Shot } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ShotListTableViewProps {
  scene: WorkspaceNode | null;
  scenes: WorkspaceNode[];
  onSelectScene: (sceneId: string) => void;
  onOpenReel?: (initialShotId?: string) => void;
}

const COMMON_SHOT_TYPES = [
  'WIDE',
  'MEDIUM',
  'CLOSE-UP',
  'EXTREME CLOSE-UP',
  'OVER-THE-SHOULDER',
  'POINT-OF-VIEW',
  'INSERT',
  'ESTABLISHING',
  'TWO-SHOT',
  'DUTCH ANGLE',
];

const COMMON_LENSES = [
  '24mm Wide',
  '35mm Prime',
  '50mm Anamorphic',
  '85mm Portrait',
  '100mm Macro',
  '70-200mm Telephoto',
  '18-35mm Zoom',
];

const COMMON_MOVEMENTS = [
  'Static',
  'Pan Left',
  'Pan Right',
  'Tilt Up',
  'Tilt Down',
  'Dolly In',
  'Dolly Out',
  'Steadicam Tracking',
  'Handheld',
  'Crane / Jib',
  'Drone Aerial',
];

export const ShotListTableView: React.FC<ShotListTableViewProps> = ({
  scene,
  scenes,
  onSelectScene,
  onOpenReel,
}) => {
  const {
    shotsByScene,
    nodes,
    childrenMap,
    createSceneShot,
    updateSceneShot,
    removeShot,
    uploadShotStoryboard,
    attachBlockToShot,
  } = useWorkspaceStore();

  const [isAddingShot, setIsAddingShot] = useState(false);
  const [newShotNumber, setNewShotNumber] = useState('');
  const [newShotType, setNewShotType] = useState('WIDE');
  const [newShotLens, setNewShotLens] = useState('35mm Prime');
  const [newShotMovement, setNewShotMovement] = useState('Static');
  const [newShotDuration, setNewShotDuration] = useState('4.0');
  const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);
  const [coverageModalShotId, setCoverageModalShotId] = useState<string | null>(null);

  // Hidden file input refs for each shot
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const shots: Shot[] = useMemo(() => {
    if (!scene) return [];
    return shotsByScene[scene.id] || [];
  }, [scene, shotsByScene]);

  // Total Scene Runtime Calculation (in MM:SS)
  const totalSceneRuntime = useMemo(() => {
    const totalSecs = shots.reduce((acc, s) => acc + (Number(s.duration_seconds) || 0), 0);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.round(totalSecs % 60);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return {
      formatted,
      totalSecs,
    };
  }, [shots]);

  // Lens distribution calculation
  const lensDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    shots.forEach((s) => {
      const lensName = (s.lens || 'Unspecified').trim();
      counts[lensName] = (counts[lensName] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [shots]);

  // Blocks belonging to this scene for coverage linking
  const sceneBlocks = useMemo(() => {
    if (!scene) return [];
    const blockIds = childrenMap[scene.id] || [];
    return blockIds
      .map((id) => nodes[id])
      .filter((n): n is WorkspaceNode => Boolean(n));
  }, [scene, childrenMap, nodes]);

  // Handle direct file upload for a shot
  const handleFileUpload = async (shotId: string, file: File) => {
    if (!scene || !file) return;
    setUploadingShotId(shotId);
    try {
      await uploadShotStoryboard(shotId, file, scene.id);
    } catch (err) {
      console.error('Failed to upload storyboard image', err);
    } finally {
      setUploadingShotId(null);
    }
  };

  // Handle duration edit
  const handleDurationChange = async (shotId: string, val: string) => {
    if (!scene) return;
    const dur = parseFloat(val);
    if (!isNaN(dur) && dur >= 0) {
      await updateSceneShot(shotId, { duration_seconds: dur }, scene.id);
    }
  };

  // Handle create new shot
  const handleCreateShot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scene || !newShotNumber.trim()) return;

    await createSceneShot(scene.id, {
      shot_number: newShotNumber.trim(),
      shot_type: newShotType,
      lens: newShotLens,
      duration_seconds: parseFloat(newShotDuration) || 3.0,
      movement: newShotMovement,
    });

    setNewShotNumber('');
    setIsAddingShot(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header / Stats Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 no-print">
        <div className="flex items-center space-x-4">
          {/* Scene Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">Scene:</span>
            <select
              value={scene?.id || ''}
              onChange={(e) => onSelectScene(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {scenes.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  SCENE {idx + 1}: {s.title || 'Untitled'}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Live Scene Runtime Calculator Pill */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              Scene Runtime:
            </span>
            <span className="text-sm font-mono font-bold text-white">
              {totalSceneRuntime.formatted}
            </span>
            <span className="text-[10px] font-mono text-amber-400/80">
              ({totalSceneRuntime.totalSecs}s)
            </span>
          </div>

          {/* Lens Distribution Badge Pills */}
          {lensDistribution.length > 0 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-md py-0.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">
                Lenses:
              </span>
              {lensDistribution.map(([lens, count]) => (
                <span
                  key={lens}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-cyan-300 shrink-0"
                >
                  <Camera className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{lens}</span>
                  <span className="bg-cyan-500/20 text-cyan-200 px-1 rounded-full font-bold">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {onOpenReel && shots.length > 0 && (
            <button
              onClick={() => onOpenReel()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-medium transition-colors"
            >
              <Play className="w-3 h-3 fill-indigo-400" />
              <span>Storyboard Reel</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            disabled={shots.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium disabled:opacity-40 transition-colors"
            title="Print Production Shot Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={() => setIsAddingShot(!isAddingShot)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium shadow-md shadow-cyan-950/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shot</span>
          </button>
        </div>
      </div>

      {/* Inline New Shot Creation Form */}
      {isAddingShot && (
        <form
          onSubmit={handleCreateShot}
          className="border-b border-slate-800 bg-slate-900/90 px-6 py-3 grid grid-cols-6 gap-3 items-end animate-in fade-in slide-in-from-top-2 duration-150 no-print"
        >
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Shot #
            </label>
            <input
              type="text"
              value={newShotNumber}
              onChange={(e) => setNewShotNumber(e.target.value)}
              placeholder="e.g. 1A"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Shot Type
            </label>
            <select
              value={newShotType}
              onChange={(e) => setNewShotType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              {COMMON_SHOT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Lens
            </label>
            <input
              type="text"
              list="common-lenses-list"
              value={newShotLens}
              onChange={(e) => setNewShotLens(e.target.value)}
              placeholder="e.g. 50mm Prime"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Movement
            </label>
            <select
              value={newShotMovement}
              onChange={(e) => setNewShotMovement(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              {COMMON_MOVEMENTS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
              Duration (s)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={newShotDuration}
              onChange={(e) => setNewShotDuration(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={!newShotNumber.trim()}
              className="flex-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-mono font-semibold transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsAddingShot(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white text-xs font-mono transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Main Table View */}
      <div className="flex-1 overflow-auto p-6">
        {/* Print-only Production Header */}
        <div className="hidden print:block mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold uppercase font-mono tracking-wider">
            PRODUCTION SHOT LIST — {scene?.title || 'SCENE'}
          </h1>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-slate-700">
            <span>TOTAL SHOTS: {shots.length}</span>
            <span>ESTIMATED SCENE RUNTIME: {totalSceneRuntime.formatted} ({totalSceneRuntime.totalSecs}s)</span>
            <span>DATE: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        {shots.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl max-w-md mx-auto px-6">
            <Film className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">
              No Shots Scheduled
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Plan your camera coverage for this scene. Add shots with lens setups, camera
              movement, live runtime calculations, and storyboard image uploads.
            </p>
            <button
              onClick={() => setIsAddingShot(true)}
              className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium shadow-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule First Shot</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <table className="print-shot-table w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Shot #</th>
                  <th className="px-4 py-3 font-semibold">Thumbnail / Dropzone</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Lens</th>
                  <th className="px-4 py-3 font-semibold">Movement</th>
                  <th className="px-4 py-3 font-semibold">Duration (s)</th>
                  <th className="px-4 py-3 font-semibold">Covered Script Blocks</th>
                  <th className="px-4 py-3 font-semibold text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shots.map((shot) => {
                  const isUploading = uploadingShotId === shot.id;
                  const coveredCount = shot.blocks?.length || 0;

                  return (
                    <tr
                      key={shot.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Shot # */}
                      <td className="px-4 py-3 font-bold text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {shot.shot_number}
                        </span>
                      </td>

                      {/* Storyboard Thumbnail & Dropzone */}
                      <td className="px-4 py-3">
                        <div
                          onClick={() => fileInputRefs.current[shot.id]?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleFileUpload(shot.id, e.dataTransfer.files[0]);
                            }
                          }}
                          className={`relative w-28 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                            isUploading ? 'opacity-50 ring-2 ring-cyan-500' : 'hover:border-cyan-500/60'
                          }`}
                          title="Click or drag image to upload storyboard frame"
                        >
                          {shot.storyboard_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={shot.storyboard_url}
                                alt={`Shot ${shot.shot_number}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white space-x-1">
                                <Upload className="w-3 h-3 text-cyan-400" />
                                <span>Change</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-1 text-slate-500 group-hover:text-cyan-400 transition-colors">
                              {isUploading ? (
                                <span className="text-[10px] animate-pulse">Uploading...</span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Upload className="w-4 h-4 mb-0.5 opacity-60" />
                                  <span className="text-[9px] uppercase font-mono">Upload</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Hidden File Input */}
                          <input
                            ref={(el) => {
                              fileInputRefs.current[shot.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(shot.id, e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      </td>

                      {/* Shot Type */}
                      <td className="px-4 py-3">
                        <select
                          value={shot.shot_type || 'WIDE'}
                          onChange={(e) => {
                            if (scene) {
                              updateSceneShot(shot.id, { shot_type: e.target.value }, scene.id);
                            }
                          }}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          {COMMON_SHOT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Lens */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          list="common-lenses-list"
                          defaultValue={shot.lens || ''}
                          onBlur={(e) => {
                            if (scene && e.target.value !== shot.lens) {
                              updateSceneShot(shot.id, { lens: e.target.value }, scene.id);
                            }
                          }}
                          placeholder="e.g. 50mm Prime"
                          className="w-32 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </td>

                      {/* Movement */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          defaultValue={shot.movement || 'Static'}
                          onBlur={(e) => {
                            if (scene && e.target.value !== shot.movement) {
                              updateSceneShot(shot.id, { movement: e.target.value }, scene.id);
                            }
                          }}
                          placeholder="Movement"
                          className="w-28 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </td>

                      {/* Duration (s) — Inline editable */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            defaultValue={shot.duration_seconds}
                            onChange={(e) => handleDurationChange(shot.id, e.target.value)}
                            className="w-16 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none"
                          />
                          <span className="text-slate-500 text-[11px]">sec</span>
                        </div>
                      </td>

                      {/* Covered Text Preview */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="space-y-1">
                          {coveredCount > 0 ? (
                            shot.blocks?.slice(0, 2).map((b) => (
                              <div
                                key={b.id}
                                className="truncate text-[11px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                                title={b.content}
                              >
                                <span className="text-cyan-400 mr-1 uppercase font-semibold">
                                  [{b.type}]
                                </span>
                                {b.content.slice(0, 36)}...
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-600 italic">No script coverage</span>
                          )}
                          <button
                            onClick={() => setCoverageModalShotId(shot.id)}
                            className="no-print text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                          >
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>
                              {coveredCount > 0 ? `Manage Coverage (${coveredCount})` : '+ Link Script Block'}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right no-print">
                        <div className="flex items-center justify-end space-x-2">
                          {onOpenReel && shot.storyboard_url && (
                            <button
                              onClick={() => onOpenReel(shot.id)}
                              className="text-slate-400 hover:text-indigo-400 p-1 rounded transition-colors"
                              title="View frame in Storyboard Reel"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (scene) removeShot(shot.id, scene.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors opacity-70 group-hover:opacity-100"
                            title="Delete shot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coverage Link Modal */}
      {coverageModalShotId && scene && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white font-mono flex items-center space-x-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                <span>Link Script Blocks to Shot</span>
              </h3>
              <button
                onClick={() => setCoverageModalShotId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 font-mono">
              Click any scene block below to link or unlink coverage with this shot:
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {sceneBlocks.map((b) => {
                const targetShot = shots.find((s) => s.id === coverageModalShotId);
                const isCovered = targetShot?.blocks?.some((cov) => cov.id === b.id);

                return (
                  <button
                    key={b.id}
                    onClick={async () => {
                      if (coverageModalShotId) {
                        await attachBlockToShot(coverageModalShotId, b.id, scene.id);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all flex items-start justify-between ${
                      isCovered
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 truncate pr-2">
                      <span className="text-cyan-400 font-semibold uppercase mr-1.5">
                        [{b.type}]
                      </span>
                      <span>{b.content || '(empty block)'}</span>
                    </div>
                    {isCovered && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold shrink-0">
                        Covered
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 mt-3 border-t border-slate-800">
              <button
                onClick={() => setCoverageModalShotId(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Datalist for lens suggestions */}
      <datalist id="common-lenses-list">
        {COMMON_LENSES.map((lens) => (
          <option key={lens} value={lens} />
        ))}
      </datalist>
    </div>
  );
};
