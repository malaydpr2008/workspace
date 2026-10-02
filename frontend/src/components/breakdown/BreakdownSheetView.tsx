'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Tag,
  Trash2,
} from 'lucide-react';
import { WorkspaceNode, BreakdownCategory } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CATEGORY_CONFIGS, BreakdownBadge } from './BreakdownBadge';
import { downloadFile } from '@/lib/compiler';

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
    nodes,
    childrenMap,
    breakdownElements,
    removeBreakdownElement,
  } = useWorkspaceStore();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Sub-Header & Controls Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800/60">
                      <tr>
                        <th className="px-4 py-2 font-medium">Element Name</th>
                        <th className="px-4 py-2 font-medium">Scene Mentions</th>
                        <th className="px-4 py-2 font-medium">Script Context</th>
                        <th className="px-4 py-2 font-medium">Notes</th>
                        <th className="px-4 py-2 font-medium text-right">Actions</th>
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
                          <td className="px-4 py-3 text-right">
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
    </div>
  );
};
