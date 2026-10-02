'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clapperboard,
  Film,
  Camera,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  User,
} from 'lucide-react';
import { WorkspaceNode, Shot } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ScreenplayViewProps {
  node: WorkspaceNode;
}

export const ScreenplayView: React.FC<ScreenplayViewProps> = ({ node }) => {
  const {
    nodes,
    childrenMap,
    shotsByScene,
    characters,
    loadSceneShots,
    loadNodeChildren,
    selectNode,
  } = useWorkspaceStore();

  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [userSelectedSceneId, setUserSelectedSceneId] = useState<string | null>(null);

  const isScene = node.type === 'scene';

  const scenes: WorkspaceNode[] = useMemo(() => {
    if (isScene) return [node];
    const childIds = childrenMap[node.id] || [];
    return childIds
      .map((cid) => nodes[cid])
      .filter((n): n is WorkspaceNode => n?.type === 'scene');
  }, [isScene, node, childrenMap, nodes]);

  const activeSceneId = isScene
    ? node.id
    : (userSelectedSceneId && scenes.some((s) => s.id === userSelectedSceneId)
        ? userSelectedSceneId
        : scenes[0]?.id) || '';

  useEffect(() => {
    if (activeSceneId) {
      loadSceneShots(activeSceneId);
      if (!childrenMap[activeSceneId]) {
        loadNodeChildren(activeSceneId);
      }
    }
  }, [activeSceneId, loadSceneShots, loadNodeChildren, childrenMap]);

  const currentScene = nodes[activeSceneId] || (isScene ? node : null);
  const sceneBlocks = currentScene
    ? (childrenMap[currentScene.id] || [])
        .map((cid) => nodes[cid])
        .filter((n): n is WorkspaceNode => Boolean(n))
    : [];

  const shots: Shot[] = activeSceneId ? shotsByScene[activeSceneId] || [] : [];
  const activeShot = shots.find((s) => s.id === activeShotId) || shots[0] || null;

  // Set of block IDs covered by the active shot
  const coveredBlockIds = new Set<string>();
  if (activeShot?.blocks) {
    activeShot.blocks.forEach((b) => coveredBlockIds.add(b.id));
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                {node.title || 'Untitled Screenplay'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SCREENPLAY
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{scenes.length} Scene{scenes.length === 1 ? '' : 's'}</span>
              <span>•</span>
              <span>{shots.length} Storyboarded Shot{shots.length === 1 ? '' : 's'}</span>
              {node.properties?.author && (
                <>
                  <span>•</span>
                  <span>Writer: {node.properties.author}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Scene Selector Pill Switcher */}
        {scenes.length > 1 && (
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {scenes.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => setUserSelectedSceneId(sc.id)}
                className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                  activeSceneId === sc.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scene {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Split View: Script Layout on Left, Shot List on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Script Flow (Courier Prime / Monospace standard format) */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 border-r border-slate-800/80 bg-slate-950/40">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Screenplay Heading */}
            {!isScene && (
              <div className="text-center pb-8 border-b border-slate-800/60">
                <h2 className="text-2xl font-mono font-bold tracking-widest text-slate-200 uppercase">
                  {node.title}
                </h2>
                {node.properties?.author && (
                  <p className="text-xs font-mono text-slate-400 mt-2">
                    WRITTEN BY {node.properties.author.toUpperCase()}
                  </p>
                )}
              </div>
            )}

            {/* Current Scene Display */}
            {currentScene ? (
              <div className="space-y-6">
                {/* Scene Heading slugline */}
                <div
                  onClick={() => selectNode(currentScene.id)}
                  className="group flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center space-x-2">
                    <Film className="w-4 h-4 text-rose-400" />
                    <span className="font-mono font-bold text-sm tracking-wide text-white uppercase">
                      {currentScene.title || 'INT. SCENE - DAY'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 group-hover:text-cyan-400 flex items-center space-x-1">
                    <span>Rank: {currentScene.rank}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Blocks under this scene */}
                {sceneBlocks.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-xs">
                    No action or dialogue blocks in this scene yet.
                  </div>
                ) : (
                  sceneBlocks.map((block) => {
                    const isCovered = coveredBlockIds.has(block.id);
                    const characterId = block.properties?.character_id;
                    const character = characterId ? characters[characterId] : null;
                    const characterName =
                      block.properties?.character_name || character?.name;

                    if (block.type === 'action') {
                      return (
                        <div
                          key={block.id}
                          className={`p-4 rounded-lg font-mono text-sm leading-relaxed transition-all duration-200 ${
                            isCovered
                              ? 'bg-cyan-950/30 border border-cyan-500/50 shadow-sm shadow-cyan-950 text-cyan-100'
                              : 'text-slate-300 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans">
                            <span>Action Block</span>
                            {isCovered && (
                              <span className="text-cyan-400 font-medium flex items-center space-x-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Covered by Shot {activeShot?.shot_number}</span>
                              </span>
                            )}
                          </div>
                          <p>{block.content}</p>
                        </div>
                      );
                    }

                    if (block.type === 'dialogue') {
                      return (
                        <div
                          key={block.id}
                          className={`p-5 rounded-lg transition-all duration-200 ${
                            isCovered
                              ? 'bg-blue-950/40 border border-cyan-400/60 ring-1 ring-cyan-400/20 shadow-lg shadow-cyan-950/40'
                              : 'hover:bg-slate-900/40'
                          }`}
                        >
                          {/* Character Name in Screenplay Format (Centered / Monospaced Uppercase) */}
                          <div className="text-center">
                            <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                              <User className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{characterName || 'SPEAKER'}</span>
                            </div>

                            {/* Parenthetical */}
                            {block.properties?.parenthetical && (
                              <div className="text-xs font-mono text-slate-400 italic mt-0.5">
                                ({block.properties.parenthetical})
                              </div>
                            )}
                          </div>

                          {/* Dialogue text */}
                          <div className="max-w-md mx-auto mt-2 text-center">
                            <p className="font-mono text-sm leading-relaxed text-slate-200">
                              &ldquo;{block.content}&rdquo;
                            </p>
                          </div>

                          {isCovered && (
                            <div className="text-center mt-3">
                              <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                <Camera className="w-3 h-3" />
                                <span>In-Frame: Shot {activeShot?.shot_number}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={block.id}
                        className="p-3 text-xs font-mono text-slate-400 bg-slate-900/40 rounded border border-slate-800"
                      >
                        <span className="uppercase text-slate-500 mr-2">[{block.type}]</span>
                        {block.content || block.title}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                Select or create a scene to view script flow.
              </div>
            )}
          </div>
        </div>

        {/* Right: Synchronized Shot List & Storyboard Panel */}
        <div className="w-96 flex flex-col bg-slate-950/80 shrink-0 border-l border-slate-800/80">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Production Coverage & Shots
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {shots.length} Shot{shots.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/40 text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Decoupled coverage layer (Universal Pattern)</span>
          </div>

          {/* Shot Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {shots.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-lg">
                <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No shots scheduled for this scene</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Coverage links text blocks without mutating script hierarchy.
                </p>
              </div>
            ) : (
              shots.map((shot) => {
                const isSelected = activeShot?.id === shot.id;
                const coveredCount = shot.blocks?.length || 0;

                return (
                  <div
                    key={shot.id}
                    onClick={() => setActiveShotId(shot.id)}
                    className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/20'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    {/* Shot Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          SHOT {shot.shot_number}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                          {shot.shot_type || 'STANDARD'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{shot.duration_seconds}s</span>
                      </div>
                    </div>

                    {/* Storyboard Frame Image */}
                    {shot.storyboard_url ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 mb-2.5 bg-slate-950 group-hover:border-slate-700 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={shot.storyboard_url}
                          alt={`Shot ${shot.shot_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-1.5 left-2 text-[10px] font-mono text-white/90">
                          {shot.lens || 'Prime'}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center mb-2.5">
                        <Camera className="w-6 h-6 text-slate-700" />
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate">{shot.lens || 'Standard Lens'}</span>
                      <span className="text-cyan-400 font-medium">
                        {coveredCount} Block{coveredCount === 1 ? '' : 's'} Covered
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
