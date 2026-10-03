'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Tag,
  Trash2,
  Printer,
  Sparkles,
  Check,
  CheckCheck,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { WorkspaceNode, BreakdownCategory, BreakdownSuggestion } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CATEGORY_CONFIGS, BreakdownBadge } from './BreakdownBadge';
import { downloadFile } from '@/lib/compiler';
import { autoDetectSceneBreakdown } from '@/lib/api';

interface BreakdownSheetViewProps {
  scene: WorkspaceNode | null;
  scenes: WorkspaceNode[];
  onSelectScene: (sceneId: string) => void;
  screenplayNode: WorkspaceNode;
}

const CATEGORIES: BreakdownCategory[] = [
  'PROP',
  'COSTUME',
  'VFX',
  'SFX',
  'LOCATION',
  'VEHICLE',
  'MAKEUP',
];

export const BreakdownSheetView: React.FC<BreakdownSheetViewProps> = ({
  scene,
  scenes,
  onSelectScene,
  screenplayNode,
}) => {
  const {
    currentWorkspace,
    nodes,
    childrenMap,
    breakdownElements,
    addBreakdownElement,
    removeBreakdownElement,
  } = useWorkspaceStore();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Breakdown Assistant state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestions, setSuggestions] = useState<BreakdownSuggestion[]>([]);
  const [approvedNames, setApprovedNames] = useState<Set<string>>(new Set());
  const [drawerCatFilter, setDrawerCatFilter] = useState<string>('ALL');
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Blocks belonging to the current scene
  const sceneBlockIds = useMemo(() => {
    if (!scene) return new Set<string>();
    return new Set<string>(childrenMap[scene.id] || []);
  }, [scene, childrenMap]);

  // Compute elements relevant to this scene, along with mention count in this scene
  const sceneElementsWithStats = useMemo(() => {
    const allElements = Object.values(breakdownElements);

    return allElements.map((el) => {
      const activeBlockIds = (el.block_ids || []).filter((bid) => sceneBlockIds.has(bid));
      const blocks = activeBlockIds
        .map((bid) => nodes[bid])
        .filter((n): n is WorkspaceNode => Boolean(n));

      return {
        element: el,
        sceneMentions: activeBlockIds.length,
        blocks,
        isAssociatedWithScene: activeBlockIds.length > 0,
      };
    });
  }, [breakdownElements, sceneBlockIds, nodes]);

  // Filtered by scene association, category filter, and search
  const displayedItems = useMemo(() => {
    return sceneElementsWithStats
      .filter((item) => {
        // Show elements tagged in this scene (or if no scene selected, all)
        if (scene && !item.isAssociatedWithScene) return false;
        if (selectedCategoryFilter !== 'ALL' && item.element.category !== selectedCategoryFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = item.element.name.toLowerCase().includes(q);
          const matchesNotes = item.element.notes.toLowerCase().includes(q);
          return matchesName || matchesNotes;
        }
        return true;
      })
      .sort((a, b) => b.sceneMentions - a.sceneMentions || a.element.name.localeCompare(b.element.name));
  }, [sceneElementsWithStats, scene, selectedCategoryFilter, searchQuery]);

  // Group items by category for breakdown sections
  const itemsByCategory = useMemo(() => {
    const map: Partial<Record<BreakdownCategory, typeof displayedItems>> = {};
    for (const cat of CATEGORIES) {
      const items = displayedItems.filter((i) => i.element.category === cat);
      if (items.length > 0) {
        map[cat] = items;
      }
    }
    return map;
  }, [displayedItems]);

  // Summary counts
  const totalSceneElements = useMemo(() => {
    return sceneElementsWithStats.filter((i) => i.isAssociatedWithScene).length;
  }, [sceneElementsWithStats]);

  // Export handlers
  const handleExportCSV = () => {
    const sceneName = scene?.title || screenplayNode.title || 'Screenplay';
    const rows = [
      ['Scene', 'Category', 'Element Name', 'Scene Mentions', 'Notes', 'Covered Blocks Snippets'],
    ];

    displayedItems.forEach((item) => {
      const snippets = item.blocks
        .map((b) => `[${b.type.toUpperCase()}] ${b.content.replace(/"/g, '""').slice(0, 60)}`)
        .join(' | ');
      rows.push([
        `"${sceneName.replace(/"/g, '""')}"`,
        `"${item.element.category}"`,
        `"${item.element.name.replace(/"/g, '""')}"`,
        `"${item.sceneMentions}"`,
        `"${(item.element.notes || '').replace(/"/g, '""')}"`,
        `"${snippets}"`,
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const safeTitle = (scene?.title || 'breakdown').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    downloadFile(csvContent, `${safeTitle}_breakdown_sheet.csv`, 'text/csv;charset=utf-8');
  };

  const handleExportText = () => {
    const sceneName = scene?.title || screenplayNode.title || 'Screenplay';
    let text = `=======================================================\n`;
    text += `SCRIPT BREAKDOWN SHEET: ${sceneName.toUpperCase()}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `Total Production Elements: ${totalSceneElements}\n`;
    text += `=======================================================\n\n`;

    for (const cat of CATEGORIES) {
      const items = displayedItems.filter((i) => i.element.category === cat);
      if (items.length === 0) continue;

      const config = CATEGORY_CONFIGS[cat];
      text += `[ ${config.label.toUpperCase()} ] (${items.length} items)\n`;
      text += `-------------------------------------------------------\n`;
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.element.name} (Mentions: ${item.sceneMentions})\n`;
        if (item.element.notes) {
          text += `   Notes: ${item.element.notes}\n`;
        }
        if (item.blocks.length > 0) {
          item.blocks.forEach((b) => {
            text += `   - [${b.type.toUpperCase()}] ${b.content.slice(0, 80)}\n`;
          });
        }
      });
      text += `\n`;
    }

    const safeTitle = (scene?.title || 'breakdown').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    downloadFile(text, `${safeTitle}_breakdown_sheet.txt`, 'text/plain;charset=utf-8');
  };

  // Handler to run AI Auto-Detection on current scene
  const handleAutoDetect = async () => {
    const targetScene = scene || scenes[0];
    if (!targetScene) return;

    setIsDetecting(true);
    try {
      const results = await autoDetectSceneBreakdown(targetScene.id);
      setSuggestions(results);
      setApprovedNames(new Set());
      setIsDrawerOpen(true);
    } catch (err) {
      console.error('Failed to auto-detect scene breakdown', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleApproveSuggestion = async (suggestion: BreakdownSuggestion) => {
    if (!currentWorkspace) return;
    const blockIds = Array.from(sceneBlockIds);
    // Try to find the block containing the suggestion name
    const matchingBlockId = blockIds.find((bid) =>
      nodes[bid]?.content?.toLowerCase().includes(suggestion.name.toLowerCase())
    );
    const targetBlockIds = matchingBlockId
      ? [matchingBlockId]
      : blockIds.length > 0
      ? [blockIds[0]]
      : [];

    await addBreakdownElement({
      workspace: currentWorkspace.id,
      name: suggestion.name,
      category: suggestion.category,
      notes: `AI Auto-Detected (${Math.round(suggestion.confidence)}% confidence): ${suggestion.reason}`,
      block_ids: targetBlockIds,
    });

    setApprovedNames((prev) => new Set([...prev, suggestion.name]));
  };

  const handleBatchApprove = async () => {
    setIsBatchApproving(true);
    try {
      const pending = suggestions.filter((s) => !approvedNames.has(s.name));
      for (const item of pending) {
        await handleApproveSuggestion(item);
      }
    } finally {
      setIsBatchApproving(false);
    }
  };

  const drawerFilteredSuggestions = useMemo(() => {
    if (drawerCatFilter === 'ALL') return suggestions;
    return suggestions.filter((s) => s.category === drawerCatFilter);
  }, [suggestions, drawerCatFilter]);

  const pendingCount = suggestions.filter((s) => !approvedNames.has(s.name)).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Sub-Header & Controls Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 no-print">
        <div className="flex items-center space-x-3">
          {/* Scene Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-mono text-slate-400">Scene:</label>
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

          {/* Quick Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800'
              }`}
            >
              All ({displayedItems.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = sceneElementsWithStats.filter(
                (i) => i.isAssociatedWithScene && i.element.category === cat
              ).length;
              const config = CATEGORY_CONFIGS[cat];
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                    isSelected
                      ? `${config.badgeClass} ring-1 ring-white/20 font-semibold`
                      : 'text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                  <span>{config.label}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Search & Export */}
        <div className="flex items-center space-x-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elements..."
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 w-36 sm:w-48"
          />

          {/* AI Auto-Detect Elements Button */}
          <button
            onClick={handleAutoDetect}
            disabled={isDetecting || (!scene && scenes.length === 0)}
            className="flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-mono font-medium disabled:opacity-40 transition-colors shadow-sm"
            title="Scan scene action text with AI to suggest production breakdown elements"
          >
            {isDetecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{isDetecting ? 'Scanning Scene...' : 'AI Auto-Detect'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={displayedItems.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-medium disabled:opacity-40 transition-colors"
            title="Export Breakdown Sheet as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportText}
            disabled={displayedItems.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium disabled:opacity-40 transition-colors"
            title="Export Breakdown Sheet as Plain Text"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          <button
            onClick={() => window.print()}
            disabled={displayedItems.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium disabled:opacity-40 transition-colors"
            title="Print Production Breakdown Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Print-only Production Binder Header */}
        <div className="hidden print:block mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold uppercase font-mono tracking-wider">
            {screenplayNode.title || 'Screenplay'} — SCRIPT BREAKDOWN SHEET
          </h1>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-slate-700">
            <span>SCENE: {scene ? scene.title : 'ALL SCENES'}</span>
            <span>TOTAL ELEMENTS: {displayedItems.length}</span>
            <span>DATE: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        {displayedItems.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl max-w-xl mx-auto px-6">
            <Tag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">
              No Production Elements Tagged
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              Tag script action or dialogue blocks with Props, Costumes, VFX, SFX, Locations,
              Vehicles, and Makeup by clicking the &ldquo;Tag Element&rdquo; button in the Script Editor.
            </p>
          </div>
        ) : (
          CATEGORIES.map((category) => {
            const items = itemsByCategory[category];
            if (!items || items.length === 0) return null;
            const config = CATEGORY_CONFIGS[category];
            const IconComponent = config.icon;

            return (
              <div
                key={category}
                className="bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden shadow-sm"
              >
                {/* Category Header */}
                <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                    <IconComponent className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      {config.label}s ({items.length})
                    </h3>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="print-breakdown-table w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800/60">
                      <tr>
                        <th className="px-4 py-2 font-medium">Element Name</th>
                        <th className="px-4 py-2 font-medium">Scene Mentions</th>
                        <th className="px-4 py-2 font-medium">Script Context</th>
                        <th className="px-4 py-2 font-medium">Notes</th>
                        <th className="px-4 py-2 font-medium text-right no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((item) => (
                        <tr
                          key={item.element.id}
                          className="hover:bg-slate-800/30 transition-colors group"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-200">
                            <div className="flex items-center space-x-2">
                              <BreakdownBadge
                                element={item.element}
                                showCategoryLabel={false}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-cyan-400 font-bold">
                            {item.sceneMentions} Block{item.sceneMentions === 1 ? '' : 's'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-md truncate">
                            {item.blocks.length > 0 ? (
                              <div className="space-y-1">
                                {item.blocks.slice(0, 2).map((b) => (
                                  <div
                                    key={b.id}
                                    className="truncate text-[11px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800"
                                  >
                                    <span className="text-cyan-400 mr-1.5 uppercase font-semibold">
                                      [{b.type}]
                                    </span>
                                    {b.content.slice(0, 60)}
                                    {b.content.length > 60 ? '...' : ''}
                                  </div>
                                ))}
                                {item.blocks.length > 2 && (
                                  <div className="text-[10px] text-slate-500 pl-1">
                                    +{item.blocks.length - 2} more blocks
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">No scene blocks</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 italic">
                            {item.element.notes || (
                              <span className="text-slate-600 not-italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right no-print">
                            <button
                              onClick={() => removeBreakdownElement(item.element.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors opacity-70 group-hover:opacity-100"
                              title="Delete element from workspace"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Breakdown Suggestions Review Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity no-print">
          <div
            className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 font-mono flex items-center space-x-2">
                    <span>AI Breakdown Assistant</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {suggestions.length} Found
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                    {scene ? scene.title : 'Scene Candidates'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Filter & Batch Actions */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
              {/* Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setDrawerCatFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    drawerCatFilter === 'ALL'
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  All ({suggestions.length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = suggestions.filter((s) => s.category === cat).length;
                  if (count === 0) return null;
                  const config = CATEGORY_CONFIGS[cat];
                  const isSel = drawerCatFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setDrawerCatFilter(cat)}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        isSel
                          ? `${config.badgeClass} ring-1 ring-white/20 font-semibold`
                          : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                      <span>{config.label}</span>
                      <span className="opacity-60 text-[9px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Batch Action Bar */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  {approvedNames.size} approved • {pendingCount} pending
                </span>
                <button
                  onClick={handleBatchApprove}
                  disabled={pendingCount === 0 || isBatchApproving}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {isBatchApproving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Batch Approve All ({pendingCount})</span>
                </button>
              </div>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drawerFilteredSuggestions.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-mono">
                    {suggestions.length === 0
                      ? 'No candidate elements detected in this scene text.'
                      : 'No suggestions match this department filter.'}
                  </p>
                </div>
              ) : (
                drawerFilteredSuggestions.map((item, idx) => {
                  const isApproved = approvedNames.has(item.name);
                  const config = CATEGORY_CONFIGS[item.category] || CATEGORY_CONFIGS.PROP;
                  const IconComp = config.icon;
                  const confPct = Math.round(item.confidence);
                  const confColor =
                    confPct >= 85
                      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
                      : confPct >= 70
                      ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
                      : 'text-indigo-400 bg-indigo-950/60 border-indigo-500/40';

                  return (
                    <div
                      key={`${item.category}-${item.name}-${idx}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isApproved
                          ? 'bg-slate-950/40 border-emerald-900/40 opacity-75'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Badges */}
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${config.badgeClass}`}
                            >
                              <IconComp className="w-3 h-3" />
                              <span>{config.label}</span>
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${confColor}`}
                            >
                              {confPct}% Confidence
                            </span>
                          </div>

                          {/* Name */}
                          <h4 className="text-sm font-semibold text-slate-100 font-mono truncate">
                            {item.name}
                          </h4>

                          {/* Rationale */}
                          <p className="text-xs text-slate-400 font-sans leading-relaxed">
                            {item.reason}
                          </p>
                        </div>

                        {/* Approve Button */}
                        <div className="shrink-0 pt-0.5">
                          {isApproved ? (
                            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Approved</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApproveSuggestion(item)}
                              className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-medium transition-colors shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
