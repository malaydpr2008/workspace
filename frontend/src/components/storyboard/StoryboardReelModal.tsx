'use client';

import React from 'react';
import {
  Film,
  Camera,
  Clock,
  X,
  User,
  Sliders,
} from 'lucide-react';
import { WorkspaceNode, Shot } from '@/types/workspace';

interface StoryboardReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: WorkspaceNode | null;
  shots: Shot[];
  activeShotId: string | null;
  onSelectShot: (shotId: string) => void;
}

export const StoryboardReelModal: React.FC<StoryboardReelModalProps> = ({
  isOpen,
  onClose,
  scene,
  shots,
  activeShotId,
  onSelectShot,
}) => {
  if (!isOpen || !scene) return null;

  const totalDuration = shots.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                  Storyboard Reel: {scene.title || 'SCENE'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {shots.length} SHOTS
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5 font-mono">
                <span>Total Duration: {totalDuration.toFixed(1)}s</span>
                <span>•</span>
                <span>Aspect Ratio: 16:9 Cinema</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Sequence Strip */}
        {shots.length > 0 && (
          <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center space-x-2 overflow-x-auto text-xs">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0 mr-2">
              Timeline Flow:
            </span>
            {shots.map((shot) => {
              const isSelected = shot.id === activeShotId;
              const widthPct = Math.max(8, Math.min(25, (shot.duration_seconds / totalDuration) * 100));

              return (
                <button
                  key={shot.id}
                  onClick={() => onSelectShot(shot.id)}
                  style={{ minWidth: `${widthPct * 5}px` }}
                  className={`h-7 px-2.5 rounded flex items-center justify-between text-[11px] font-mono truncate transition-all ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-bold mr-1">#{shot.shot_number}</span>
                  <span className="text-[10px] opacity-75">{shot.duration_seconds}s</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Shots Visual Grid */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {shots.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
              <Camera className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400 font-medium">
                No storyboard shots created for this scene yet.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Use the &ldquo;+ New Shot&rdquo; button in the screenplay panel to create camera setups and link narrative blocks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shots.map((shot) => {
                const isSelected = shot.id === activeShotId;
                const coveredBlocks = shot.blocks || [];

                return (
                  <div
                    key={shot.id}
                    onClick={() => onSelectShot(shot.id)}
                    className={`group rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xl shadow-cyan-950/60'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div>
                      {/* Shot Top Specs */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold">
                            SHOT {shot.shot_number}
                          </span>
                          <span className="text-xs font-semibold text-white uppercase tracking-wide">
                            {shot.shot_type || 'STANDARD'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{shot.duration_seconds}s</span>
                        </div>
                      </div>

                      {/* Storyboard Viewfinder Frame */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-800 mb-3 group-hover:border-slate-700 transition-colors">
                        {shot.storyboard_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={shot.storyboard_url}
                            alt={`Shot ${shot.shot_number}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center space-y-1 text-slate-700">
                            <Camera className="w-8 h-8" />
                            <span className="text-[10px] font-mono">VIEWFINDER FRAME</span>
                          </div>
                        )}

                        {/* Viewfinder Rule-of-Thirds Grid Overlay */}
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 group-hover:opacity-40 transition-opacity">
                          <div className="border-r border-b border-white/50" />
                          <div className="border-r border-b border-white/50" />
                          <div className="border-b border-white/50" />
                          <div className="border-r border-b border-white/50" />
                          <div className="border-r border-b border-white/50" />
                          <div className="border-b border-white/50" />
                          <div className="border-r border-white/50" />
                          <div className="border-r border-white/50" />
                          <div />
                        </div>

                        {/* Bottom Lens pill */}
                        <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono text-cyan-300 border border-white/10">
                          {shot.lens || '50mm Prime'}
                        </div>
                      </div>

                      {/* Covered Narrative Lines */}
                      <div className="space-y-1.5 text-xs">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center justify-between">
                          <span>Covered Narrative Content:</span>
                          <span className="text-cyan-400 font-bold">{coveredBlocks.length} blocks</span>
                        </div>

                        {coveredBlocks.length === 0 ? (
                          <div className="p-2 rounded bg-slate-950/60 border border-dashed border-slate-800 text-[11px] text-slate-500 italic">
                            No script blocks linked to this shot yet.
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {coveredBlocks.map((block) => (
                              <div
                                key={block.id}
                                className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 leading-snug"
                              >
                                {block.type === 'dialogue' && (
                                  <div className="flex items-center space-x-1 text-cyan-400 font-bold text-[10px] uppercase mb-0.5">
                                    <User className="w-2.5 h-2.5" />
                                    <span>
                                      {block.properties?.character_name || 'SPEAKER'}
                                    </span>
                                  </div>
                                )}
                                <p className="truncate">&ldquo;{block.content}&rdquo;</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Sliders className="w-3 h-3 text-slate-500" />
                        <span>Decoupled Coverage</span>
                      </span>
                      {isSelected ? (
                        <span className="text-cyan-400 font-bold">Active in Editor</span>
                      ) : (
                        <span className="text-slate-500 group-hover:text-slate-300">
                          Click to Focus
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
