'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Music,
  Volume2,
  CloudRain,
  X,
  Plus,
  Trash2,
  Clock,
  Sliders,
  Film,
} from 'lucide-react';
import {
  WorkspaceNode,
  AudioSpottingCue,
  AudioCueType,
  AudioIntensity,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface AudioSpottingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scene: WorkspaceNode | null;
  scenes: WorkspaceNode[];
  onSelectScene: (sceneId: string) => void;
}

export const CUE_TYPE_CONFIG: Record<
  AudioCueType,
  { label: string; icon: React.FC<{ className?: string }>; color: string; border: string; bg: string }
> = {
  SCORE: {
    label: 'Score / Score Music',
    icon: Music,
    color: 'text-indigo-400',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
  },
  SOURCE_MUSIC: {
    label: 'Source Music (Diegetic)',
    icon: Music,
    color: 'text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
  },
  FOLEY: {
    label: 'Foley',
    icon: Volume2,
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
  },
  SFX: {
    label: 'Sound Effects (SFX)',
    icon: Volume2,
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  AMBIENCE: {
    label: 'Environmental Ambience',
    icon: CloudRain,
    color: 'text-teal-400',
    border: 'border-teal-500/30',
    bg: 'bg-teal-500/10',
  },
};

export const INTENSITY_CONFIG: Record<
  AudioIntensity,
  { label: string; color: string }
> = {
  LOW: { label: 'Low / Subtle', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  MEDIUM: { label: 'Medium', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  HIGH: { label: 'High / Energetic', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  CLIMACTIC: { label: 'Climactic / Dramatic', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
};

export const AudioSpottingDrawer: React.FC<AudioSpottingDrawerProps> = ({
  isOpen,
  onClose,
  scene,
  scenes,
  onSelectScene,
}) => {
  const {
    audioCuesByScene,
    loadAudioCuesForScene,
    createAudioSpottingCueItem,
    deleteAudioSpottingCueItem,
  } = useWorkspaceStore();

  const sceneId = scene?.id;

  useEffect(() => {
    if (isOpen && sceneId) {
      loadAudioCuesForScene(sceneId);
    }
  }, [isOpen, sceneId, loadAudioCuesForScene]);

  const cues: AudioSpottingCue[] = useMemo(() => {
    if (!sceneId) return [];
    return audioCuesByScene[sceneId] || [];
  }, [sceneId, audioCuesByScene]);

  // Track Type Filter
  const [filterType, setFilterType] = useState<'ALL' | 'MUSIC' | 'SFX' | 'AMBIENCE'>('ALL');

  const filteredCues = useMemo(() => {
    return cues.filter((cue) => {
      if (filterType === 'MUSIC') {
        return cue.cue_type === 'SCORE' || cue.cue_type === 'SOURCE_MUSIC';
      }
      if (filterType === 'SFX') {
        return cue.cue_type === 'SFX' || cue.cue_type === 'FOLEY';
      }
      if (filterType === 'AMBIENCE') {
        return cue.cue_type === 'AMBIENCE';
      }
      return true;
    });
  }, [cues, filterType]);

  // Form State
  const [isAddingCue, setIsAddingCue] = useState(false);
  const [cueName, setCueName] = useState('');
  const [cueType, setCueType] = useState<AudioCueType>('SCORE');
  const [intensity, setIntensity] = useState<AudioIntensity>('MEDIUM');
  const [timecodeIn, setTimecodeIn] = useState('01:00:00:00');
  const [timecodeOut, setTimecodeOut] = useState('01:01:00:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateCue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scene || !cueName.trim()) return;

    setIsSubmitting(true);
    try {
      await createAudioSpottingCueItem({
        scene: scene.id,
        cue_name: cueName.trim(),
        cue_type: cueType,
        intensity,
        timecode_in: timecodeIn.trim(),
        timecode_out: timecodeOut.trim(),
        notes: notes.trim(),
      });
      setCueName('');
      setNotes('');
      setIsAddingCue(false);
    } catch (err) {
      console.error('Failed to create audio cue', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl font-mono text-xs">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Audio & Music Spotting
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {cues.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Track markers for Composer & Sound Design
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scene Selector Strip */}
          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1.5 truncate mr-2">
              <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-300 font-bold truncate">
                {scene?.title || 'Select Scene'}
              </span>
            </div>
            {scenes.length > 1 && (
              <select
                value={scene?.id || ''}
                onChange={(e) => onSelectScene(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[10px] focus:outline-none"
              >
                {scenes.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Sc {idx + 1}: {s.title.slice(0, 18)}...
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Category Tabs & Quick Add Button */}
          <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/20 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'ALL'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({cues.length})
              </button>
              <button
                onClick={() => setFilterType('MUSIC')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'MUSIC'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎵 Music
              </button>
              <button
                onClick={() => setFilterType('SFX')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'SFX'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔊 SFX
              </button>
              <button
                onClick={() => setFilterType('AMBIENCE')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'AMBIENCE'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🌧️ Ambience
              </button>
            </div>

            <button
              onClick={() => setIsAddingCue(!isAddingCue)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cue</span>
            </button>
          </div>

          {/* Add Cue Form */}
          {isAddingCue && (
            <form
              onSubmit={handleCreateCue}
              className="p-4 border-b border-indigo-500/30 bg-indigo-950/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0"
            >
              <div className="flex items-center justify-between text-indigo-300 font-bold uppercase text-[11px]">
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Spot New Audio Cue</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingCue(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">
                  Cue Name
                </label>
                <input
                  type="text"
                  value={cueName}
                  onChange={(e) => setCueName(e.target.value)}
                  placeholder="e.g. Airlock Alarm & Rising Bass Pulse"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Track Type
                  </label>
                  <select
                    value={cueType}
                    onChange={(e) => setCueType(e.target.value as AudioCueType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SCORE">Score / Score Music</option>
                    <option value="SOURCE_MUSIC">Source Music (Diegetic)</option>
                    <option value="FOLEY">Foley</option>
                    <option value="SFX">Sound Effects (SFX)</option>
                    <option value="AMBIENCE">Environmental Ambience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Intensity
                  </label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value as AudioIntensity)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low / Subtle</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High / Energetic</option>
                    <option value="CLIMACTIC">Climactic / Dramatic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Timecode In
                  </label>
                  <input
                    type="text"
                    value={timecodeIn}
                    onChange={(e) => setTimecodeIn(e.target.value)}
                    placeholder="01:00:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    Timecode Out
                  </label>
                  <input
                    type="text"
                    value={timecodeOut}
                    onChange={(e) => setTimecodeOut(e.target.value)}
                    placeholder="01:01:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">
                  Composer / Sound Designer Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sub-bass rumble under dialogue, drop out immediately on gunshot..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingCue(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cueName.trim() || isSubmitting}
                  className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-bold shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Add Audio Cue'}
                </button>
              </div>
            </form>
          )}

          {/* Cue Cards Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredCues.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2 text-slate-500">
                <Music className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs font-semibold text-slate-400">
                  No audio cues spotted in this scene.
                </p>
                <p className="text-[11px] text-slate-600">
                  Click &ldquo;Cue&rdquo; above to attach Music cues, Foley, SFX, or Ambience markers.
                </p>
              </div>
            ) : (
              filteredCues.map((cue) => {
                const typeCfg = CUE_TYPE_CONFIG[cue.cue_type] || CUE_TYPE_CONFIG.SCORE;
                const intensityCfg = INTENSITY_CONFIG[cue.intensity] || INTENSITY_CONFIG.MEDIUM;
                const IconComponent = typeCfg.icon;

                return (
                  <div
                    key={cue.id}
                    className={`p-3 rounded-xl border ${typeCfg.border} ${typeCfg.bg} space-y-2 group transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`w-3.5 h-3.5 ${typeCfg.color}`} />
                        <span className="font-bold text-white tracking-wide text-xs">
                          {cue.cue_name}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (scene) deleteAudioSpottingCueItem(cue.id, scene.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                        title="Delete audio cue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded border font-medium ${typeCfg.color} ${typeCfg.bg}`}>
                        {typeCfg.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded border font-medium ${intensityCfg.color}`}>
                        {intensityCfg.label}
                      </span>
                      {(cue.timecode_in || cue.timecode_out) && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {cue.timecode_in || '00:00:00:00'} &rarr; {cue.timecode_out || 'End'}
                          </span>
                        </span>
                      )}
                    </div>

                    {cue.notes && (
                      <p className="text-[11px] text-slate-300 italic pl-2 border-l-2 border-slate-700 leading-relaxed">
                        {cue.notes}
                      </p>
                    )}
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
