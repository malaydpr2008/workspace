'use client';

import React, { useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Film,
  MessageSquare,
  Users,
  Camera,
  Activity,
  Flame,
  Zap,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceNode, Character, BreakdownElement, Shot } from '@/types/workspace';
import { calculateScreenplayAnalytics } from '@/lib/analytics';
import { CATEGORY_CONFIGS } from '@/components/breakdown/BreakdownBadge';

interface ProductionAnalyticsViewProps {
  screenplayNode: WorkspaceNode;
  nodes: Record<string, WorkspaceNode>;
  characters: Record<string, Character>;
  breakdownElements: Record<string, BreakdownElement>;
  shotsByScene: Record<string, Shot[]>;
  onSelectScene?: (sceneId: string) => void;
}

export const ProductionAnalyticsView: React.FC<ProductionAnalyticsViewProps> = ({
  screenplayNode,
  nodes,
  characters,
  breakdownElements,
  shotsByScene,
  onSelectScene,
}) => {
  // Collect all nodes belonging to this screenplay subtree
  const allSubNodes = useMemo(() => {
    return Object.values(nodes);
  }, [nodes]);

  const allElements = useMemo(() => {
    return Object.values(breakdownElements);
  }, [breakdownElements]);

  const allShots = useMemo(() => {
    return Object.values(shotsByScene).flat();
  }, [shotsByScene]);

  const analytics = useMemo(() => {
    return calculateScreenplayAnalytics(allSubNodes, characters, allElements, allShots);
  }, [allSubNodes, characters, allElements, allShots]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 lg:p-8 space-y-8">
      {/* Top Title & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              Production Analytics & Narrative Pacing
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {screenplayNode.title || 'Screenplay'} • Dialogue distributions, pacing rhythm, camera setups, and department breakdown
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300">
            {analytics.totalWords.toLocaleString()} Total Words
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Est. Runtime: ~{analytics.estimatedRuntimeMinutes} min</span>
          </span>
        </div>
      </div>

      {/* Visual KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Runtime Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Est. Screen Time</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">
              {analytics.estimatedRuntimeMinutes}
            </span>
            <span className="text-xs text-slate-500 font-mono">minutes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {analytics.totalShots > 0
              ? `${analytics.totalShotDurationSeconds}s scheduled across ${analytics.totalShots} shots`
              : 'Based on standard 1-page/min industry pacing'}
          </p>
        </div>

        {/* Total Scenes Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Scene Density</span>
            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Film className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">
              {analytics.totalScenes}
            </span>
            <span className="text-xs text-slate-500 font-mono">scenes</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Avg {analytics.totalScenes > 0 ? Math.round(analytics.totalWords / analytics.totalScenes) : 0} words per scene
          </p>
        </div>

        {/* Dialogue Lines Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Spoken Dialogue</span>
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">
              {analytics.totalDialogueLines}
            </span>
            <span className="text-xs text-slate-500 font-mono">lines</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {analytics.characterStats.length} Speaking Character{analytics.characterStats.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Production Elements Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400">Production Elements</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">
              {analytics.totalProductionElements}
            </span>
            <span className="text-xs text-slate-500 font-mono">items</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Props, costumes, VFX, SFX & locations tagged
          </p>
        </div>
      </div>

      {/* Row 1: Character Dialogue Share & Pacing Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Character Dialogue Distribution */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white font-sans">
                Character Dialogue Share
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {analytics.totalDialogueWords.toLocaleString()} words total
            </span>
          </div>

          {analytics.characterStats.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 font-mono">
              No dialogue blocks recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.characterStats.slice(0, 7).map((char) => (
                <div key={char.characterName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: char.color }}
                      />
                      <span>{char.characterName}</span>
                    </span>
                    <span className="text-slate-400">
                      {char.wordCount} words ({char.wordPercentage}%) • {char.lineCount} lines
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, char.wordPercentage)}%`,
                        backgroundColor: char.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              {analytics.characterStats.length > 7 && (
                <p className="text-[11px] text-slate-500 font-mono pt-1 text-center">
                  +{analytics.characterStats.length - 7} more secondary character cues
                </p>
              )}
            </div>
          )}
        </div>

        {/* Narrative Rhythm & Action-to-Dialogue Ratio */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white font-sans">
                Narrative Rhythm (Action vs. Spoken Dialogue)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Overall Balance</span>
          </div>

          {/* Macro Split Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-semibold flex items-center space-x-1">
                <span>Action / Visuals:</span>
                <span>
                  {analytics.totalWords > 0
                    ? Math.round((analytics.totalActionWords / analytics.totalWords) * 100)
                    : 50}
                  %
                </span>
              </span>
              <span className="text-violet-400 font-semibold flex items-center space-x-1">
                <span>Dialogue:</span>
                <span>
                  {analytics.totalWords > 0
                    ? Math.round((analytics.totalDialogueWords / analytics.totalWords) * 100)
                    : 50}
                  %
                </span>
              </span>
            </div>

            <div className="w-full h-4 rounded-lg bg-slate-950 overflow-hidden border border-slate-800 flex">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                style={{
                  width: `${
                    analytics.totalWords > 0
                      ? (analytics.totalActionWords / analytics.totalWords) * 100
                      : 50
                  }%`,
                }}
                title={`Action words: ${analytics.totalActionWords}`}
              />
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                style={{
                  width: `${
                    analytics.totalWords > 0
                      ? (analytics.totalDialogueWords / analytics.totalWords) * 100
                      : 50
                  }%`,
                }}
                title={`Dialogue words: ${analytics.totalDialogueWords}`}
              />
            </div>
          </div>

          {/* Department Breakdown Mini-Grid */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">
              Production Department Distribution
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {analytics.departmentStats.map((dept) => {
                const config = CATEGORY_CONFIGS[dept.category];
                return (
                  <div
                    key={dept.category}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-1.5 text-xs font-mono">
                      <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                      <span className="text-slate-300">{dept.label}</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-white">
                      {dept.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Scene Pacing Heatmap */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white font-sans">
              Scene Pacing & Narrative Density Heatmap
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {analytics.scenePacingStats.length} Scenes Analyzed
          </span>
        </div>

        {analytics.scenePacingStats.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No scenes detected in this document.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase text-slate-500 px-3 pb-1 border-b border-slate-800">
              <span className="col-span-1">#</span>
              <span className="col-span-3">Scene Title</span>
              <span className="col-span-3">Pacing Rhythm</span>
              <span className="col-span-2 text-center">Words</span>
              <span className="col-span-1 text-center">Shots</span>
              <span className="col-span-2 text-right">Est. Time</span>
            </div>

            <div className="divide-y divide-slate-800/50">
              {analytics.scenePacingStats.map((scene) => {
                const isActionHeavy = scene.pacingCategory === 'FAST_ACTION';
                const isDialogueHeavy = scene.pacingCategory === 'DIALOGUE_HEAVY';

                return (
                  <div
                    key={scene.sceneId}
                    onClick={() => onSelectScene?.(scene.sceneId)}
                    className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-slate-800/30 transition-colors cursor-pointer text-xs font-mono group"
                  >
                    {/* Scene # */}
                    <span className="col-span-1 text-cyan-400 font-bold">
                      SC {scene.sceneNumber}
                    </span>

                    {/* Scene Title */}
                    <span className="col-span-3 font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                      {scene.sceneTitle}
                    </span>

                    {/* Action vs Dialogue Visual Rhythm Bar */}
                    <div className="col-span-3 space-y-1">
                      <div className="w-full h-2 rounded bg-slate-950 border border-slate-800 flex overflow-hidden">
                        <div
                          className="h-full bg-cyan-500"
                          style={{ width: `${scene.actionRatio * 100}%` }}
                          title={`Action: ${scene.actionWordCount} words`}
                        />
                        <div
                          className="h-full bg-violet-500"
                          style={{ width: `${scene.dialogueRatio * 100}%` }}
                          title={`Dialogue: ${scene.dialogueWordCount} words`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-500">
                        <span>{Math.round(scene.actionRatio * 100)}% visual</span>
                        <span
                          className={`font-semibold ${
                            isActionHeavy
                              ? 'text-cyan-400'
                              : isDialogueHeavy
                              ? 'text-violet-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {scene.pacingCategory.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Word Count */}
                    <span className="col-span-2 text-center text-slate-300">
                      {scene.totalWordCount}
                    </span>

                    {/* Shots Count */}
                    <span className="col-span-1 text-center">
                      {scene.shotsCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                          {scene.shotsCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </span>

                    {/* Est. Duration */}
                    <span className="col-span-2 text-right text-amber-400 font-bold">
                      {Math.floor(scene.estimatedDurationSeconds / 60)}:
                      {String(scene.estimatedDurationSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Camera Optics & Shot Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shot Types */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Shot Type Composition
            </h4>
          </div>

          {analytics.shotTypeDistribution.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4">No shots scheduled yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.shotTypeDistribution.slice(0, 5).map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 truncate">{item.name}</span>
                    <span className="text-cyan-400 font-bold">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lens Distribution */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Camera Lens Packages
            </h4>
          </div>

          {analytics.lensDistribution.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4">No lenses recorded</p>
          ) : (
            <div className="space-y-2">
              {analytics.lensDistribution.slice(0, 5).map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 truncate">{item.name}</span>
                    <span className="text-amber-400 font-bold">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camera Movements */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Camera Movement
            </h4>
          </div>

          {analytics.movementDistribution.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4">No movements specified</p>
          ) : (
            <div className="space-y-2">
              {analytics.movementDistribution.slice(0, 5).map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 truncate">{item.name}</span>
                    <span className="text-emerald-400 font-bold">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
