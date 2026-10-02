'use client';

import React, { useState, useMemo } from 'react';
import {
  Mic,
  X,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  FileText,
  Volume2,
} from 'lucide-react';
import {
  WorkspaceNode,
  Character,
  ADRCue,
  ADRReason,
  ADRPriority,
  ADRStatus,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ADRCueModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogueBlock: WorkspaceNode | null;
  character: Character | null;
  characterName: string;
  existingCues?: ADRCue[];
}

export const REASON_CONFIG: Record<ADRReason, { label: string; color: string }> = {
  NOISE: { label: 'Noise / Audio Issue', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  PERFORMANCE: { label: 'Performance / Delivery', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  LINE_CHANGE: { label: 'Line Change / Alt Take', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  TV_CLEAN: { label: 'TV Clean / Censorship', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  ACCENT: { label: 'Accent / Diction', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  OTHER: { label: 'Other Reason', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

export const PRIORITY_CONFIG: Record<ADRPriority, { label: string; color: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  STANDARD: { label: 'Standard', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  OPTIONAL: { label: 'Optional', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

export const STATUS_CONFIG: Record<ADRStatus, { label: string; color: string }> = {
  NEEDS_REVIEW: { label: 'Needs Review', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
  SCHEDULED: { label: 'Scheduled', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
  RECORDED: { label: 'Recorded', color: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/40' },
  APPROVED: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
  OMITTED: { label: 'Omitted', color: 'text-slate-500 bg-slate-800/40 border-slate-700' },
};

export const ADRCueModal: React.FC<ADRCueModalProps> = ({
  isOpen,
  onClose,
  dialogueBlock,
  character,
  characterName,
  existingCues = [],
}) => {
  const { createADRCueItem, deleteADRCueItem, updateADRCueStatusItem, adrCues } =
    useWorkspaceStore();

  // Auto-generate cue prefix from character name
  const autoPrefix = useMemo(() => {
    const raw = (character?.name || characterName || 'CHAR')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase();
    return raw.slice(0, 3).padEnd(3, 'X');
  }, [character?.name, characterName]);

  // Compute total cues count for this prefix to suggest next number
  const suggestedCueNumber = useMemo(() => {
    const allCues = Object.values(adrCues).flat();
    const matching = allCues.filter((c) => c.cue_number?.startsWith(autoPrefix));
    const nextIdx = matching.length + 1;
    return `${autoPrefix}-${String(nextIdx).padStart(3, '0')}`;
  }, [adrCues, autoPrefix]);

  const [cueNumber, setCueNumber] = useState('');
  const [reason, setReason] = useState<ADRReason>('NOISE');
  const [priority, setPriority] = useState<ADRPriority>('STANDARD');
  const [timecodeIn, setTimecodeIn] = useState('01:00:00:00');
  const [timecodeOut, setTimecodeOut] = useState('01:00:05:00');
  const [actorNotes, setActorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Active cue number is either user override or suggested
  const effectiveCueNumber = cueNumber.trim() || suggestedCueNumber;

  if (!isOpen || !dialogueBlock) return null;

  const handleCreateCue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogueBlock || !character) return;

    setIsSubmitting(true);
    try {
      await createADRCueItem({
        dialogue_node: dialogueBlock.id,
        character: character.id,
        cue_number: effectiveCueNumber,
        reason,
        priority,
        status: 'NEEDS_REVIEW',
        timecode_in: timecodeIn.trim() || '01:00:00:00',
        timecode_out: timecodeOut.trim() || '01:00:05:00',
        actor_notes: actorNotes.trim(),
      });
      setCueNumber('');
      setActorNotes('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create ADR cue', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  ADR Cue Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {characterName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automated Dialogue Replacement & Loop Recording Tagging
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Spoken Dialogue Line Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
              <span className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Script Dialogue Line</span>
              </span>
              <span className="text-cyan-300 font-mono">{characterName}</span>
            </div>
            <p className="text-sm text-slate-200 font-mono italic leading-relaxed pl-2 border-l-2 border-cyan-500/60">
              &ldquo;{dialogueBlock.content || '(empty dialogue)'}&rdquo;
            </p>
            {dialogueBlock.properties?.parenthetical && (
              <p className="text-xs text-slate-400 italic">
                ({dialogueBlock.properties.parenthetical})
              </p>
            )}
          </div>

          {/* Existing ADR Cues List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Logged ADR Cues ({existingCues.length})
                </h3>
              </div>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New ADR Cue</span>
                </button>
              )}
            </div>

            {existingCues.length === 0 && !showAddForm ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2 text-slate-500">
                <Mic className="w-7 h-7 mx-auto text-slate-700" />
                <p className="text-xs font-medium">No ADR cues tagged on this line</p>
                <p className="text-[11px] text-slate-600">
                  Tag this line if re-recording is needed due to set noise, actor performance, or censorship.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 rounded text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Cue {suggestedCueNumber}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {existingCues.map((cue) => {
                  const reasonCfg = REASON_CONFIG[cue.reason] || REASON_CONFIG.OTHER;
                  const priorityCfg = PRIORITY_CONFIG[cue.priority] || PRIORITY_CONFIG.STANDARD;
                  const statusCfg = STATUS_CONFIG[cue.status] || STATUS_CONFIG.NEEDS_REVIEW;

                  return (
                    <div
                      key={cue.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {cue.cue_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${reasonCfg.color}`}>
                            {reasonCfg.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${priorityCfg.color}`}>
                            {priorityCfg.label}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <select
                            value={cue.status}
                            onChange={(e) =>
                              updateADRCueStatusItem(cue.id, e.target.value, dialogueBlock.id)
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border focus:outline-none ${statusCfg.color} bg-slate-950`}
                          >
                            <option value="NEEDS_REVIEW">Needs Review</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="RECORDED">Recorded</option>
                            <option value="APPROVED">Approved</option>
                            <option value="OMITTED">Omitted</option>
                          </select>
                          <button
                            onClick={() => deleteADRCueItem(cue.id, dialogueBlock.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete ADR Cue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>
                            {cue.timecode_in} &rarr; {cue.timecode_out}
                          </span>
                        </div>
                        {cue.actor_notes && (
                          <div className="flex-1 truncate italic text-slate-300">
                            Notes: &ldquo;{cue.actor_notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Cue Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateCue}
              className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center space-x-1.5">
                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tag Line for ADR Recording</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Cue Number
                  </label>
                  <input
                    type="text"
                    value={cueNumber}
                    onChange={(e) => setCueNumber(e.target.value.toUpperCase())}
                    placeholder={suggestedCueNumber}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ADRReason)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NOISE">Noise / Audio Issue</option>
                    <option value="PERFORMANCE">Performance / Delivery</option>
                    <option value="LINE_CHANGE">Line Change / Alt Take</option>
                    <option value="TV_CLEAN">TV Clean / Censorship</option>
                    <option value="ACCENT">Accent / Diction</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ADRPriority)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="STANDARD">Standard</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Timecode In (HH:MM:SS:FF)
                  </label>
                  <input
                    type="text"
                    value={timecodeIn}
                    onChange={(e) => setTimecodeIn(e.target.value)}
                    placeholder="01:00:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Timecode Out (HH:MM:SS:FF)
                  </label>
                  <input
                    type="text"
                    value={timecodeOut}
                    onChange={(e) => setTimecodeOut(e.target.value)}
                    placeholder="01:00:05:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">
                  Actor Loop Guidance Notes
                </label>
                <textarea
                  value={actorNotes}
                  onChange={(e) => setActorNotes(e.target.value)}
                  placeholder="e.g. Match mouth sync on final word, deliver with higher urgency..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 transition-colors shadow-md flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save ADR Cue'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
