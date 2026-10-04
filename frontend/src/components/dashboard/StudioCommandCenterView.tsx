'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Clapperboard,
  DollarSign,
  Calendar,
  Users,
  Layers,
  Film,
  Printer,
  ShieldAlert,
  Mic,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  CheckCheck,
} from 'lucide-react';
import {
  WorkspaceNode,
  RevisionColor,
} from '@/types/workspace';
import { getRevisionConfig } from '@/lib/revision';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ProductionTimelineView } from '@/components/timeline/ProductionTimelineView';

interface StudioCommandCenterViewProps {
  screenplayNode: WorkspaceNode;
  onJumpToTab?: (
    tab:
      | 'editor'
      | 'board'
      | 'shotlist'
      | 'breakdown'
      | 'analytics'
      | 'stripboard'
      | 'adr'
      | 'budget'
  ) => void;
  onSelectScene?: (sceneId: string) => void;
}

export const StudioCommandCenterView: React.FC<StudioCommandCenterViewProps> = ({
  screenplayNode,
  onJumpToTab,
}) => {
  const {
    currentWorkspace,
    nodes,
    childrenMap,
    characters,
    breakdownElements,
    shotsByScene,
    notesByNode,
    adrCues,
    audioCuesByScene,
    schedules,
    shootingDays,
    budgets,
    activeBudgetId,
    milestones,
    loadBudgets,
    loadSchedules,
    loadMilestones,
    loadBreakdownElements,
    loadNotesForWorkspace,
    loadADRCues,
  } = useWorkspaceStore();

  const [activeTimelineTab, setActiveTimelineTab] = useState<'kpi' | 'timeline' | 'both'>('both');

  // Load relevant workspace datasets if not yet populated
  useEffect(() => {
    if (screenplayNode.id) {
      loadBudgets(screenplayNode.id, currentWorkspace?.id);
      loadSchedules(screenplayNode.id);
      loadMilestones(screenplayNode.id, currentWorkspace?.id);
    }
  }, [screenplayNode.id, currentWorkspace?.id, loadBudgets, loadSchedules, loadMilestones]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadBreakdownElements(currentWorkspace.id);
      loadNotesForWorkspace(currentWorkspace.id);
      loadADRCues(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadBreakdownElements, loadNotesForWorkspace, loadADRCues]);

  // Derived Scenes list
  const isScene = screenplayNode.type === 'scene';
  const scenes: WorkspaceNode[] = useMemo(() => {
    if (isScene) return [screenplayNode];
    const childIds = childrenMap[screenplayNode.id] || [];
    return childIds
      .map((cid) => nodes[cid])
      .filter((n): n is WorkspaceNode => n?.type === 'scene');
  }, [isScene, screenplayNode, childrenMap, nodes]);

  // Total blocks and estimated pages
  const totalSceneBlocks = useMemo(() => {
    let count = 0;
    scenes.forEach((sc) => {
      count += (childrenMap[sc.id] || []).length;
    });
    return count;
  }, [scenes, childrenMap]);

  const estimatedPages = useMemo(() => {
    if (totalSceneBlocks === 0) return Math.max(1, Math.round(scenes.length * 1.5));
    return Math.max(1, Math.ceil(totalSceneBlocks / 18));
  }, [totalSceneBlocks, scenes.length]);

  const totalWordCount = useMemo(() => {
    let count = 0;
    scenes.forEach((sc) => {
      const childIds = childrenMap[sc.id] || [];
      childIds.forEach((cid) => {
        const blk = nodes[cid];
        if (blk?.content) {
          count += blk.content.trim().split(/\s+/).filter(Boolean).length;
        }
      });
      if (sc.content) {
        count += sc.content.trim().split(/\s+/).filter(Boolean).length;
      }
    });
    return count;
  }, [scenes, childrenMap, nodes]);

  // Script Revision State
  const activeRevisionColor = (screenplayNode.revision_color ||
    screenplayNode.properties?.revision_color ||
    'WHITE') as RevisionColor;
  const isScreenplayLocked = Boolean(
    screenplayNode.is_locked || screenplayNode.properties?.is_locked
  );
  const revisionConfig = getRevisionConfig(activeRevisionColor);

  // Financial Burn Metrics
  const activeBudget = useMemo(() => {
    return budgets.find((b) => b.id === activeBudgetId) || budgets[0] || null;
  }, [budgets, activeBudgetId]);

  const totalBudgetAmount = activeBudget ? Number(activeBudget.grand_total) || 0 : 0;
  const actualSpentAmount = activeBudget ? Number(activeBudget.actual_total) || 0 : 0;
  const budgetVariance = totalBudgetAmount - actualSpentAmount;
  const burnRatePct =
    totalBudgetAmount > 0 ? Math.min(100, Math.round((actualSpentAmount / totalBudgetAmount) * 100)) : 0;

  const atlCategory = activeBudget?.categories?.find((c) => c.tier === 'ATL');
  const btlProdCategory = activeBudget?.categories?.find((c) => c.tier === 'BTL_PRODUCTION');
  const btlPostCategory = activeBudget?.categories?.find((c) => c.tier === 'BTL_POST');
  const otherCategory = activeBudget?.categories?.find((c) => c.tier === 'OTHER');

  // Production Logistics
  const totalShootDays = shootingDays.length;
  const totalCastCount = Object.keys(characters).length;
  const castAssignedCount = Object.values(characters).filter(
    (c) => Boolean(c.metadata?.actor_name || c.metadata?.actor)
  ).length;
  const castReadinessPct =
    totalCastCount > 0 ? Math.round((castAssignedCount / totalCastCount) * 100) : 0;

  const totalBreakdownCount = Object.keys(breakdownElements).length;
  const taggedElementsCount = Object.values(breakdownElements).filter(
    (el) => el.block_ids && el.block_ids.length > 0
  ).length;
  const artPropsReadinessPct =
    totalBreakdownCount > 0 ? Math.round((taggedElementsCount / totalBreakdownCount) * 100) : 0;

  const scenesWithShots = useMemo(
    () => scenes.filter((s) => (shotsByScene[s.id]?.length || 0) > 0).length,
    [scenes, shotsByScene]
  );
  const storyboardCoveragePct =
    scenes.length > 0 ? Math.round((scenesWithShots / scenes.length) * 100) : 0;

  const scenesWithAudio = useMemo(
    () => scenes.filter((s) => (audioCuesByScene[s.id]?.length || 0) > 0).length,
    [scenes, audioCuesByScene]
  );
  const soundSpottingPct =
    scenes.length > 0 ? Math.round((scenesWithAudio / scenes.length) * 100) : 0;

  const overallReadinessPct = Math.round(
    (castReadinessPct + artPropsReadinessPct + storyboardCoveragePct + soundSpottingPct) / 4
  );

  // Editorial Clearance / Review Notes
  const allReviewNotes = useMemo(() => Object.values(notesByNode).flat(), [notesByNode]);
  const openNotes = useMemo(() => allReviewNotes.filter((n) => !n.is_resolved), [allReviewNotes]);
  const resolvedNotes = useMemo(() => allReviewNotes.filter((n) => n.is_resolved), [allReviewNotes]);
  const legalOpenCount = useMemo(
    () => openNotes.filter((n) => n.category === 'LEGAL').length,
    [openNotes]
  );
  const continuityOpenCount = useMemo(
    () => openNotes.filter((n) => n.category === 'CONTINUITY').length,
    [openNotes]
  );
  const creativeOpenCount = useMemo(
    () => openNotes.filter((n) => n.category === 'CREATIVE').length,
    [openNotes]
  );
  const directorOpenCount = useMemo(
    () => openNotes.filter((n) => n.category === 'DIRECTOR').length,
    [openNotes]
  );

  // Sound & ADR Health
  const allADR = useMemo(() => Object.values(adrCues).flat(), [adrCues]);
  const totalADRCues = allADR.length;
  const approvedADRCues = useMemo(
    () => allADR.filter((c) => c.status === 'APPROVED').length,
    [allADR]
  );
  const pendingADRCues = useMemo(
    () => allADR.filter((c) => c.status !== 'APPROVED').length,
    [allADR]
  );
  const recordedADRCues = useMemo(
    () => allADR.filter((c) => c.status === 'RECORDED').length,
    [allADR]
  );
  const totalAudioSpottingCount = useMemo(
    () => Object.values(audioCuesByScene).flat().length,
    [audioCuesByScene]
  );

  // Milestone Progress
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
  const inProgressMilestones = milestones.filter((m) => m.status === 'IN_PROGRESS').length;
  const delayedMilestones = milestones.filter((m) => m.status === 'DELAYED').length;
  const overallMilestoneProgress =
    totalMilestones > 0
      ? Math.round(
          milestones.reduce((acc, m) => acc + (m.progress_percentage || 0), 0) / totalMilestones
        )
      : 0;

  const formatCurrency = (val: number) => {
    return '$' + Math.abs(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* SCREEN UI: Studio Command Center Toolbar & Quick Actions */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                Studio Command Center
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                EXECUTIVE OVERVIEW
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Aggregated real-time metrics across all production departments
            </p>
          </div>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="flex items-center space-x-2">
          {onJumpToTab && (
            <>
              <button
                onClick={() => onJumpToTab('editor')}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors border border-slate-700"
                title="Jump to Screenplay Editor"
              >
                <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Script Editor</span>
              </button>
              <button
                onClick={() => onJumpToTab('stripboard')}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors border border-slate-700"
                title="Jump to Production Stripboard"
              >
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Schedule ({totalShootDays}d)</span>
              </button>
              <button
                onClick={() => onJumpToTab('budget')}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors border border-slate-700"
                title="Jump to Production Budget Ledger"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Budget Ledger</span>
              </button>
              <button
                onClick={() => onJumpToTab('adr')}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors border border-slate-700"
                title="Jump to ADR Recording Sheet"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>ADR Studio</span>
              </button>
            </>
          )}

          {/* View Filter Pill */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTimelineTab('both')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTimelineTab === 'both'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTimelineTab('kpi')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTimelineTab === 'kpi'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              KPIs
            </button>
            <button
              onClick={() => setActiveTimelineTab('timeline')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTimelineTab === 'timeline'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Export Executive Briefing (Print/PDF) */}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-medium shadow-sm transition-all border border-emerald-500/40"
            title="Export full 2-page Studio Executive Briefing to PDF / Print"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Briefing (PDF)</span>
          </button>
        </div>
      </div>

      {/* MAIN SCREEN DASHBOARD CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-print">
        {/* Executive Banner: Project Identity & Master Health */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {screenplayNode.title || 'Untitled Feature Film'}
                </h2>
                <span
                  className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold tracking-wide uppercase shadow-sm border"
                  style={{
                    backgroundColor: `${revisionConfig.hex}25`,
                    color: revisionConfig.hex,
                    borderColor: `${revisionConfig.hex}60`,
                  }}
                >
                  {revisionConfig.label}
                </span>
                {isScreenplayLocked ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    LOCKED SCENES (A1/1A)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    WORKING DRAFT
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 flex items-center space-x-3">
                <span>Studio: {currentWorkspace?.name || 'Solo Studio Production'}</span>
                <span>•</span>
                <span>Author: {screenplayNode.properties?.author || 'Solo Creator'}</span>
                <span>•</span>
                <span>Est. Screen Time: ~{estimatedPages} Mins ({scenes.length} Scenes Drafted • {totalWordCount.toLocaleString()} Words)</span>
              </p>
            </div>

            {/* Quick Readiness Score Gauge */}
            <div className="flex items-center space-x-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 px-5 backdrop-blur">
              <div>
                <div className="text-[11px] font-mono uppercase text-slate-400">
                  Production Readiness
                </div>
                <div className="text-2xl font-bold font-mono text-white flex items-center space-x-2">
                  <span>{overallReadinessPct}%</span>
                  <span className="text-xs font-normal text-slate-400">overall</span>
                </div>
              </div>
              <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${overallReadinessPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {(activeTimelineTab === 'both' || activeTimelineTab === 'kpi') && (
          <>
            {/* EXECUTIVE HEALTH GRID (5 Subsystem KPI Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: 🎨 Script Draft Health */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors backdrop-blur shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-cyan-400 font-mono mb-2">
                    <span className="flex items-center space-x-1.5 font-semibold">
                      <Clapperboard className="w-3.5 h-3.5" />
                      <span>Script Draft Health</span>
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: revisionConfig.hex }}
                      title={`Draft Color: ${revisionConfig.draftName}`}
                    />
                  </div>
                  <div className="text-xl font-bold font-mono text-white mb-1">
                    {scenes.length} Scenes Drafted
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-3">
                    {totalWordCount.toLocaleString()} Words • ~{estimatedPages} Mins Screen Time
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Lock Status:</span>
                  <span
                    className={
                      isScreenplayLocked
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-300'
                    }
                  >
                    {isScreenplayLocked ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
              </div>

              {/* Card 2: 💰 Financial Burn Gauge */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors backdrop-blur shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-mono mb-2">
                    <span className="flex items-center space-x-1.5 font-semibold">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Financial Burn</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      {burnRatePct}% Spent
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mb-1">
                    {formatCurrency(actualSpentAmount)}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-3">
                    Budget: {formatCurrency(totalBudgetAmount)}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Net Variance:</span>
                  <span
                    className={`font-semibold flex items-center space-x-1 ${
                      budgetVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {budgetVariance >= 0 ? (
                      <TrendingUp className="w-3 h-3 inline" />
                    ) : (
                      <TrendingDown className="w-3 h-3 inline" />
                    )}
                    <span>
                      {budgetVariance >= 0 ? '+' : '-'}
                      {formatCurrency(budgetVariance)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Card 3: 🎬 Production Logistics */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-sky-500/20 hover:border-sky-500/40 transition-colors backdrop-blur shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-sky-400 font-mono mb-2">
                    <span className="flex items-center space-x-1.5 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Production Logistics</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                      {schedules.length} Sched
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mb-1">
                    {totalShootDays} Shoot Days
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-3">
                    {totalCastCount} Cast • {totalBreakdownCount} Breakdown
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Cast Assigned:</span>
                  <span className="text-sky-300 font-semibold">
                    {castAssignedCount}/{totalCastCount} ({castReadinessPct}%)
                  </span>
                </div>
              </div>

              {/* Card 4: 📝 Editorial Clearance */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-amber-500/20 hover:border-amber-500/40 transition-colors backdrop-blur shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-400 font-mono mb-2">
                    <span className="flex items-center space-x-1.5 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Editorial Clearance</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {resolvedNotes.length} Resolved
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mb-1">
                    {openNotes.length} Open Notes
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-3">
                    {legalOpenCount} Legal • {continuityOpenCount} Continuity
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Creative / Dir:</span>
                  <span className="text-amber-300 font-semibold">
                    {creativeOpenCount + directorOpenCount} Pending
                  </span>
                </div>
              </div>

              {/* Card 5: 🎙️ Sound & ADR Health */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-violet-500/20 hover:border-violet-500/40 transition-colors backdrop-blur shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-violet-400 font-mono mb-2">
                    <span className="flex items-center space-x-1.5 font-semibold">
                      <Mic className="w-3.5 h-3.5" />
                      <span>Sound & ADR Health</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                      {approvedADRCues} Approved
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white mb-1">
                    {totalADRCues} ADR Cues
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-3">
                    {pendingADRCues} Pending • {recordedADRCues} Recorded
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Audio Spotting:</span>
                  <span className="text-violet-300 font-semibold">
                    {totalAudioSpottingCount} Cues
                  </span>
                </div>
              </div>
            </div>

            {/* Department Readiness Matrix & Financial Top-Sheet Recap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Readiness Progress Bars (2 columns on large screens) */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono flex items-center space-x-2">
                      <CheckCheck className="w-4 h-4 text-cyan-400" />
                      <span>Department Readiness Matrix</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Pre-production readiness percentage across core filmmaking verticals
                    </p>
                  </div>
                  <div className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                    Live Status
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Readiness 1: Cast Readiness */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-400" />
                        <span>Cast Readiness</span>
                      </span>
                      <span className="font-semibold text-sky-400">{castReadinessPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${castReadinessPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>{castAssignedCount} actors assigned</span>
                      <span>{totalCastCount} total characters</span>
                    </div>
                  </div>

                  {/* Readiness 2: Art & Props Tagged */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Art & Props Breakdown</span>
                      </span>
                      <span className="font-semibold text-amber-400">{artPropsReadinessPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${artPropsReadinessPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>{taggedElementsCount} tagged to scenes</span>
                      <span>{totalBreakdownCount} total elements</span>
                    </div>
                  </div>

                  {/* Readiness 3: Storyboard Coverage */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center space-x-1.5">
                        <Film className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Storyboard & Shot Coverage</span>
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {storyboardCoveragePct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${storyboardCoveragePct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>{scenesWithShots} covered scenes</span>
                      <span>{scenes.length} total scenes</span>
                    </div>
                  </div>

                  {/* Readiness 4: Sound Spotting */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 flex items-center space-x-1.5">
                        <Mic className="w-3.5 h-3.5 text-violet-400" />
                        <span>Audio & Music Spotting</span>
                      </span>
                      <span className="font-semibold text-violet-400">{soundSpottingPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${soundSpottingPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>{scenesWithAudio} spotted scenes</span>
                      <span>{totalAudioSpottingCount} total cues</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Top-Sheet Summary Recap */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Financial Top-Sheet</span>
                    </h3>
                    {onJumpToTab && (
                      <button
                        onClick={() => onJumpToTab('budget')}
                        className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                      >
                        <span>Ledger</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-800/60 text-xs font-mono pt-2 space-y-2">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Above-The-Line (ATL):</span>
                      <span className="text-white font-semibold">
                        {atlCategory ? formatCurrency(atlCategory.subtotal_estimated) : '$0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">BTL Production:</span>
                      <span className="text-white font-semibold">
                        {btlProdCategory ? formatCurrency(btlProdCategory.subtotal_estimated) : '$0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">BTL Post-Production:</span>
                      <span className="text-white font-semibold">
                        {btlPostCategory ? formatCurrency(btlPostCategory.subtotal_estimated) : '$0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">Other / Contingency:</span>
                      <span className="text-white font-semibold">
                        {otherCategory ? formatCurrency(otherCategory.subtotal_estimated) : '$0'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Grand Total:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatCurrency(totalBudgetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Actual Spent:</span>
                    <span className="text-slate-300 font-semibold">
                      {formatCurrency(actualSpentAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* INTERACTIVE PRODUCTION GANTT TIMELINE SECTION */}
        {(activeTimelineTab === 'both' || activeTimelineTab === 'timeline') && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">
                  Timeline Milestone Health:
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {completedMilestones} Completed
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {inProgressMilestones} In Progress
                </span>
                {delayedMilestones > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {delayedMilestones} Delayed
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
                <span>Overall Lifecycle Completion:</span>
                <span className="font-bold text-white font-mono">{overallMilestoneProgress}%</span>
              </div>
            </div>

            <ProductionTimelineView
              screenplayNode={screenplayNode}
              milestones={milestones}
            />
          </div>
        )}
      </div>

      {/* PRINT-ONLY EXECUTIVE BRIEFING ENGINE (Formatted for 2-page print / PDF export) */}
      <div className="hidden print:block print-executive-briefing font-mono text-black bg-white">
        {/* PAGE 1: Studio Executive Briefing & Top-Sheet Recap */}
        <div className="print-page-1 p-8 space-y-6">
          {/* Header */}
          <div className="briefing-header pb-4 border-b-2 border-black flex justify-between items-start">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-600 font-bold mb-1">
                Studio Executive Production Briefing
              </div>
              <h1 className="text-2xl font-bold uppercase tracking-tight text-black">
                {screenplayNode.title || 'UNTITLED FEATURE'}
              </h1>
              <div className="text-xs text-slate-700 mt-1">
                Studio: {currentWorkspace?.name || 'Studio Production'} • Project ID:{' '}
                {screenplayNode.id.substring(0, 8)}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block border border-black px-3 py-1 font-bold text-xs uppercase mb-1">
                {revisionConfig.label} ({revisionConfig.draftName})
              </div>
              <div className="text-[10px] text-slate-600">
                Date: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </div>
              <div className="text-[10px] text-slate-600">
                Lock Status: {isScreenplayLocked ? 'LOCKED (A1/1A)' : 'ACTIVE DRAFT'}
              </div>
            </div>
          </div>

          {/* Key Executive Vitals */}
          <div className="grid grid-cols-4 gap-3 text-xs briefing-box bg-slate-50 border border-slate-400 p-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Author / Screenplay</div>
              <div className="font-bold">{screenplayNode.properties?.author || 'Staff Writer'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Total Scenes</div>
              <div className="font-bold">{scenes.length} Scenes</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Est. Runtime / Pages</div>
              <div className="font-bold">~{estimatedPages} Pages ({estimatedPages} Mins)</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Scheduled Shoot</div>
              <div className="font-bold">{totalShootDays} Production Days</div>
            </div>
          </div>

          {/* Section 1: Financial Top-Sheet Recap */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
              1. Financial Top-Sheet Recap
            </h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-600 text-left">
                  <th className="py-1">Account Category / Department Tier</th>
                  <th className="py-1 text-right">Budgeted</th>
                  <th className="py-1 text-right">Actual Spent</th>
                  <th className="py-1 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                <tr>
                  <td className="py-1.5 font-bold">1000 - Above-The-Line (ATL)</td>
                  <td className="py-1.5 text-right">
                    {atlCategory ? formatCurrency(atlCategory.subtotal_estimated) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {atlCategory ? formatCurrency(atlCategory.subtotal_actual) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {atlCategory ? formatCurrency(atlCategory.subtotal_variance) : '$0'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold">3000 - Below-The-Line Production (BTL)</td>
                  <td className="py-1.5 text-right">
                    {btlProdCategory ? formatCurrency(btlProdCategory.subtotal_estimated) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {btlProdCategory ? formatCurrency(btlProdCategory.subtotal_actual) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {btlProdCategory ? formatCurrency(btlProdCategory.subtotal_variance) : '$0'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold">5000 - Below-The-Line Post-Production</td>
                  <td className="py-1.5 text-right">
                    {btlPostCategory ? formatCurrency(btlPostCategory.subtotal_estimated) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {btlPostCategory ? formatCurrency(btlPostCategory.subtotal_actual) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {btlPostCategory ? formatCurrency(btlPostCategory.subtotal_variance) : '$0'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold">7000 - Other & Contingency Reserve</td>
                  <td className="py-1.5 text-right">
                    {otherCategory ? formatCurrency(otherCategory.subtotal_estimated) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {otherCategory ? formatCurrency(otherCategory.subtotal_actual) : '$0'}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {otherCategory ? formatCurrency(otherCategory.subtotal_variance) : '$0'}
                  </td>
                </tr>
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-2 uppercase">Grand Total Production Budget</td>
                  <td className="py-2 text-right">{formatCurrency(totalBudgetAmount)}</td>
                  <td className="py-2 text-right">{formatCurrency(actualSpentAmount)}</td>
                  <td className="py-2 text-right">
                    {budgetVariance >= 0 ? '+' : '-'}
                    {formatCurrency(budgetVariance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Production Logistics & Cast DOOD Recap */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
              2. Production Logistics & DOOD Recap
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 p-2.5 space-y-1">
                <div className="font-bold border-b border-slate-200 pb-1">Cast & Personnel</div>
                <div className="flex justify-between">
                  <span>Total Speaking Characters:</span>
                  <span className="font-bold">{totalCastCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cast Members Confirmed:</span>
                  <span className="font-bold">{castAssignedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cast Readiness Ratio:</span>
                  <span className="font-bold">{castReadinessPct}%</span>
                </div>
              </div>
              <div className="border border-slate-300 p-2.5 space-y-1">
                <div className="font-bold border-b border-slate-200 pb-1">Stripboard & Schedule</div>
                <div className="flex justify-between">
                  <span>Scheduled Shoot Days:</span>
                  <span className="font-bold">{totalShootDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span>Tagged Breakdown Elements:</span>
                  <span className="font-bold">{totalBreakdownCount} Items</span>
                </div>
                <div className="flex justify-between">
                  <span>Storyboard Scene Coverage:</span>
                  <span className="font-bold">{storyboardCoveragePct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Editorial Clearance & Review Summary */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
              3. Editorial Clearance & Review Clearance
            </h2>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="border border-slate-300 p-2 text-center">
                <div className="text-[10px] text-slate-500 uppercase">Legal Notes</div>
                <div className="text-base font-bold">{legalOpenCount} Open</div>
              </div>
              <div className="border border-slate-300 p-2 text-center">
                <div className="text-[10px] text-slate-500 uppercase">Continuity Notes</div>
                <div className="text-base font-bold">{continuityOpenCount} Open</div>
              </div>
              <div className="border border-slate-300 p-2 text-center">
                <div className="text-[10px] text-slate-500 uppercase">Creative Notes</div>
                <div className="text-base font-bold">{creativeOpenCount} Open</div>
              </div>
              <div className="border border-slate-300 p-2 text-center">
                <div className="text-[10px] text-slate-500 uppercase">ADR Audio Cues</div>
                <div className="text-base font-bold">{pendingADRCues} Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Break */}
        <div className="print-page-break" />

        {/* PAGE 2: Production Timeline Gantt Schedule & Department Readiness Matrix */}
        <div className="print-page-2 p-8 space-y-6">
          <div className="briefing-header pb-3 border-b-2 border-black flex justify-between items-center">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                Executive Studio Production Briefing — Page 2
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-black">
                Lifecycle Timeline & Department Readiness Matrix
              </h2>
            </div>
            <div className="text-right text-xs">
              Project: <span className="font-bold">{screenplayNode.title}</span>
            </div>
          </div>

          {/* Section 4: Production Timeline Milestones */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
              4. Master Lifecycle Milestones & Deliverables
            </h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-black text-left text-[11px] uppercase">
                  <th className="py-1">Phase</th>
                  <th className="py-1">Milestone Title</th>
                  <th className="py-1">Department</th>
                  <th className="py-1">Dates</th>
                  <th className="py-1">Status</th>
                  <th className="py-1 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {milestones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 text-center text-slate-500">
                      No milestones recorded. Standard lifecycle timeline initialized.
                    </td>
                  </tr>
                ) : (
                  milestones.map((m) => (
                    <tr key={m.id} className="py-1">
                      <td className="py-1.5 font-bold">{m.phase}</td>
                      <td className="py-1.5">{m.title}</td>
                      <td className="py-1.5 text-slate-600">{m.department || 'EXECUTIVE'}</td>
                      <td className="py-1.5 text-slate-600">
                        {m.start_date || 'TBD'} → {m.end_date || 'TBD'}
                      </td>
                      <td className="py-1.5 font-semibold">{m.status}</td>
                      <td className="py-1.5 text-right font-mono">{m.progress_percentage}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Section 5: Department Readiness Breakdown */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
              5. Department Readiness Audit
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 p-3 space-y-1">
                <div className="font-bold text-slate-800">Cast & Production Logistics</div>
                <div className="flex justify-between">
                  <span>Cast Package Readiness:</span>
                  <span className="font-bold">{castReadinessPct}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Art / Props Breakdown Coverage:</span>
                  <span className="font-bold">{artPropsReadinessPct}%</span>
                </div>
              </div>
              <div className="border border-slate-300 p-3 space-y-1">
                <div className="font-bold text-slate-800">Camera & Post Sound</div>
                <div className="flex justify-between">
                  <span>Camera Storyboard Coverage:</span>
                  <span className="font-bold">{storyboardCoveragePct}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Sound & Music Cue Spotting:</span>
                  <span className="font-bold">{soundSpottingPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Executive Sign-off & Studio Approvals */}
          <div className="pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider border-b border-black pb-1 mb-4">
              6. Executive Studio Sign-Off & Greenlight Authorization
            </h3>
            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-6">
                <div>
                  <div className="border-b border-black w-full h-8 mb-1" />
                  <div className="font-bold">Studio Head / Executive Producer</div>
                  <div className="text-[10px] text-slate-500">Date: ________________________</div>
                </div>
                <div>
                  <div className="border-b border-black w-full h-8 mb-1" />
                  <div className="font-bold">Director</div>
                  <div className="text-[10px] text-slate-500">Date: ________________________</div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="border-b border-black w-full h-8 mb-1" />
                  <div className="font-bold">Line Producer / Production Manager</div>
                  <div className="text-[10px] text-slate-500">Date: ________________________</div>
                </div>
                <div>
                  <div className="border-b border-black w-full h-8 mb-1" />
                  <div className="font-bold">Post-Production Supervisor</div>
                  <div className="text-[10px] text-slate-500">Date: ________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
