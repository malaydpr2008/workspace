'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Volume2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  WorkspaceNode,
  Character,
  ADRCue,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { downloadFile } from '@/lib/compiler';
import { REASON_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from './ADRCueModal';

interface ADRRecordingSheetViewProps {
  screenplayNode: WorkspaceNode;
  nodes: Record<string, WorkspaceNode>;
  characters: Record<string, Character>;
}

export const ADRRecordingSheetView: React.FC<ADRRecordingSheetViewProps> = ({
  screenplayNode,
  nodes,
  characters,
}) => {
  const {
    currentWorkspace,
    adrCues,
    loadADRCues,
    updateADRCueStatusItem,
    deleteADRCueItem,
  } = useWorkspaceStore();

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadADRCues(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadADRCues]);

  // Flatten all ADR cues from the store
  const allCues: ADRCue[] = useMemo(() => {
    const list: ADRCue[] = [];
    Object.values(adrCues).forEach((cues) => {
      cues.forEach((c) => list.push(c));
    });
    return list.sort((a, b) => a.cue_number.localeCompare(b.cue_number));
  }, [adrCues]);

  // Metrics
  const metrics = useMemo(() => {
    const total = allCues.length;
    const approved = allCues.filter((c) => c.status === 'APPROVED').length;
    const recorded = allCues.filter((c) => c.status === 'RECORDED').length;
    const scheduled = allCues.filter((c) => c.status === 'SCHEDULED').length;
    const pending = allCues.filter(
      (c) => c.status !== 'APPROVED' && c.status !== 'OMITTED'
    ).length;
    return { total, approved, recorded, scheduled, pending };
  }, [allCues]);

  // Filtered Cues
  const filteredCues = useMemo(() => {
    return allCues.filter((cue) => {
      if (selectedCharacterId !== 'ALL' && cue.character !== selectedCharacterId) {
        return false;
      }
      if (selectedStatus !== 'ALL' && cue.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const numMatch = cue.cue_number?.toLowerCase().includes(query);
        const charName = (cue.character_name || characters[cue.character]?.name || '').toLowerCase();
        const charMatch = charName.includes(query);
        const noteMatch = cue.actor_notes?.toLowerCase().includes(query);
        const node = nodes[cue.dialogue_node];
        const lineMatch = node?.content?.toLowerCase().includes(query);
        if (!numMatch && !charMatch && !noteMatch && !lineMatch) {
          return false;
        }
      }
      return true;
    });
  }, [allCues, selectedCharacterId, selectedStatus, searchQuery, characters, nodes]);

  // Export to CSV formatted for DAW Loop Recording
  const handleExportCSV = () => {
    const headers = [
      'Cue Number',
      'Character',
      'Dialogue Line',
      'Reason',
      'Priority',
      'Status',
      'Timecode In',
      'Timecode Out',
      'Actor Notes',
      'Scene',
    ];

    const rows = filteredCues.map((c) => {
      const charName = c.character_name || characters[c.character]?.name || 'CHARACTER';
      const node = nodes[c.dialogue_node];
      const dialogueText = (node?.content || c.dialogue_content || '').replace(/"/g, '""');
      const sceneTitle = c.scene_title || (node?.parent ? nodes[node.parent]?.title : '') || '';
      const notesClean = (c.actor_notes || '').replace(/"/g, '""');

      return [
        `"${c.cue_number}"`,
        `"${charName}"`,
        `"${dialogueText}"`,
        `"${c.reason}"`,
        `"${c.priority}"`,
        `"${c.status}"`,
        `"${c.timecode_in}"`,
        `"${c.timecode_out}"`,
        `"${notesClean}"`,
        `"${sceneTitle}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = `${(screenplayNode.title || 'screenplay')
      .toLowerCase()
      .replace(/\s+/g, '_')}_adr_cues.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden font-sans">
      {/* Top Header Summary Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur space-y-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  ADR Recording Cue Sheet
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DAW & PRO TOOLS READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track and log dialogue replacement takes, timecodes, and actor notes for loop recording
              </p>
            </div>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs shadow-md transition-colors"
            title="Download formatted CSV for Pro Tools or Nuendo loop sessions"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ADR Cues (CSV)</span>
          </button>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs">
            <span className="text-slate-500 uppercase text-[10px]">Total Cues:</span>
            <span className="font-bold text-white">{metrics.total}</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 font-mono text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">{metrics.approved}</span>
            <span className="text-slate-400 text-[10px]">Approved</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 font-mono text-xs">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-indigo-400 font-bold">{metrics.recorded}</span>
            <span className="text-slate-400 text-[10px]">Recorded</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 font-bold">{metrics.scheduled}</span>
            <span className="text-slate-400 text-[10px]">Scheduled</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 font-mono text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 font-bold">{metrics.pending}</span>
            <span className="text-slate-400 text-[10px]">Pending</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cue #, actor notes, or line text..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            {/* Character Filter */}
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 text-[11px]">Character:</span>
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="ALL">All Characters ({Object.keys(characters).length})</option>
                {Object.values(characters).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 text-[11px]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="RECORDED">Recorded</option>
                <option value="APPROVED">Approved</option>
                <option value="OMITTED">Omitted</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-6">
        {filteredCues.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-800/80 rounded-2xl max-w-lg mx-auto p-8 space-y-3 font-mono">
            <Mic className="w-10 h-10 text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No ADR Cues Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {allCues.length === 0
                ? 'Open the Script view and click the 🎙️ ADR button next to any dialogue line to tag cues for recording.'
                : 'No ADR cues match your active character or status filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cue #</th>
                  <th className="px-4 py-3 font-semibold">Character</th>
                  <th className="px-4 py-3 font-semibold max-w-xs">Original Dialogue Line</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Timecode In/Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actor Notes</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCues.map((cue) => {
                  const charName =
                    cue.character_name || characters[cue.character]?.name || 'CHARACTER';
                  const node = nodes[cue.dialogue_node];
                  const dialogueText = node?.content || cue.dialogue_content || '(Dialogue deleted)';
                  const sceneTitle =
                    cue.scene_title || (node?.parent ? nodes[node.parent]?.title : '') || '';

                  const reasonCfg = REASON_CONFIG[cue.reason] || REASON_CONFIG.OTHER;
                  const priorityCfg = PRIORITY_CONFIG[cue.priority] || PRIORITY_CONFIG.STANDARD;
                  const statusCfg = STATUS_CONFIG[cue.status] || STATUS_CONFIG.NEEDS_REVIEW;

                  return (
                    <tr
                      key={cue.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Cue # */}
                      <td className="px-4 py-3.5 font-bold text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {cue.cue_number}
                        </span>
                      </td>

                      {/* Character */}
                      <td className="px-4 py-3.5 font-bold text-white">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-cyan-300">{charName}</span>
                        </div>
                      </td>

                      {/* Original Line */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="space-y-0.5">
                          <p className="text-slate-200 italic line-clamp-2" title={dialogueText}>
                            &ldquo;{dialogueText}&rdquo;
                          </p>
                          {sceneTitle && (
                            <span className="text-[10px] text-slate-500 uppercase truncate block">
                              {sceneTitle}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border font-medium ${reasonCfg.color}`}
                        >
                          {reasonCfg.label}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border font-medium ${priorityCfg.color}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </td>

                      {/* Timecode */}
                      <td className="px-4 py-3.5 text-cyan-300 font-mono">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>
                            {cue.timecode_in} &rarr; {cue.timecode_out}
                          </span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-4 py-3.5">
                        <select
                          value={cue.status}
                          onChange={(e) =>
                            updateADRCueStatusItem(cue.id, e.target.value, cue.dialogue_node)
                          }
                          className={`px-2.5 py-1 rounded text-xs font-bold border focus:outline-none ${statusCfg.color} bg-slate-950`}
                        >
                          <option value="NEEDS_REVIEW">Needs Review</option>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="RECORDED">Recorded</option>
                          <option value="APPROVED">Approved</option>
                          <option value="OMITTED">Omitted</option>
                        </select>
                      </td>

                      {/* Actor Notes */}
                      <td className="px-4 py-3.5 max-w-xs text-slate-400">
                        <span className="line-clamp-2 italic" title={cue.actor_notes}>
                          {cue.actor_notes || '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => deleteADRCueItem(cue.id, cue.dialogue_node)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors opacity-70 group-hover:opacity-100"
                          title="Delete ADR Cue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
