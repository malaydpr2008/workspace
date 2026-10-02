'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  ExternalLink,
  Film,
  AlignLeft,
  Sparkles,
  Trash2,
  Palette,
} from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { generateRankBetween } from '@/lib/lexorank';

export interface BeatMood {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const BEAT_MOODS: BeatMood[] = [
  {
    id: 'action',
    label: 'Action / Climax',
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
  },
  {
    id: 'tense',
    label: 'Tense / Suspense',
    color: '#f43f5e',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-400',
  },
  {
    id: 'drama',
    label: 'Drama / Conflict',
    color: '#a855f7',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
  },
  {
    id: 'dialogue',
    label: 'Dialogue / Key Reveal',
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-400',
  },
  {
    id: 'mystery',
    label: 'Mystery / Mood',
    color: '#10b981',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
  },
  {
    id: 'neutral',
    label: 'Neutral / Setup',
    color: '#94a3b8',
    bgClass: 'bg-slate-800/60',
    borderClass: 'border-slate-700/60',
    textClass: 'text-slate-400',
  },
];

interface SortableBeatCardProps {
  beat: WorkspaceNode;
  index: number;
  wordCount: number;
  shotCount: number;
  beatTypeLabel: string;
  onOpenBeat: (beatId: string) => void;
  onUpdateTitle: (title: string) => void;
  onUpdateSynopsis: (synopsis: string) => void;
  onUpdateMood: (moodId: string) => void;
  onDeleteBeat: () => void;
}

const SortableBeatCard: React.FC<SortableBeatCardProps> = ({
  beat,
  index,
  wordCount,
  shotCount,
  beatTypeLabel,
  onOpenBeat,
  onUpdateTitle,
  onUpdateSynopsis,
  onUpdateMood,
  onDeleteBeat,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: beat.id });

  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const currentMoodId = beat.properties?.tone || 'neutral';
  const currentMood =
    BEAT_MOODS.find((m) => m.id === currentMoodId) || BEAT_MOODS[5];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 40 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col justify-between rounded-xl bg-slate-900/90 border transition-all duration-150 shadow-lg hover:shadow-xl hover:border-slate-700 ${
        isDragging
          ? 'border-cyan-500 ring-2 ring-cyan-500/40'
          : 'border-slate-800'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 pb-3 border-b border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          {/* Drag Handle & Beat Number */}
          <div className="flex items-center space-x-1.5">
            <button
              {...attributes}
              {...listeners}
              className="p-1 rounded cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Drag to reorder beat"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              {beatTypeLabel} {index + 1}
            </span>
          </div>

          {/* Mood / Category Badge with Popover */}
          <div className="relative">
            <button
              onClick={() => setIsMoodPickerOpen(!isMoodPickerOpen)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all ${currentMood.bgClass} ${currentMood.borderClass} ${currentMood.textClass}`}
              title="Change tone / mood category"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: currentMood.color }}
              />
              <span>{currentMood.label}</span>
              <Palette className="w-2.5 h-2.5 ml-0.5 opacity-60" />
            </button>

            {isMoodPickerOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-1 z-50 space-y-0.5 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Select Beat Mood
                </div>
                {BEAT_MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onUpdateMood(m.id);
                      setIsMoodPickerOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[11px] text-left transition-colors ${
                      currentMoodId === m.id
                        ? 'bg-slate-800 text-white font-medium'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="truncate">{m.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editable Beat Title */}
        <input
          type="text"
          value={beat.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder={`${beatTypeLabel} Title...`}
          className="w-full bg-transparent text-sm font-semibold text-slate-100 focus:outline-none border-b border-transparent focus:border-cyan-500/50 pb-0.5 transition-colors tracking-tight"
        />
      </div>

      {/* Card Body: Synopsis / Summary */}
      <div className="p-4 flex-1">
        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
          <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
          <span>Synopsis / Dramatic Goal</span>
        </label>
        <textarea
          value={beat.properties?.synopsis || ''}
          onChange={(e) => onUpdateSynopsis(e.target.value)}
          placeholder="What happens in this beat? Describe dramatic conflict, key turning points, or character motivations..."
          rows={4}
          className="w-full bg-slate-950/60 rounded-lg p-2.5 text-xs text-slate-300 leading-relaxed resize-none focus:outline-none border border-slate-800 focus:border-cyan-500/40 placeholder-slate-600 transition-colors"
        />
      </div>

      {/* Card Footer: Metadata & Actions */}
      <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-950/40 rounded-b-xl flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center space-x-3 text-[11px]">
          {shotCount > 0 ? (
            <span className="flex items-center space-x-1 text-cyan-400">
              <Film className="w-3 h-3" />
              <span>{shotCount} shots</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-slate-500">
              <AlignLeft className="w-3 h-3" />
              <span>{wordCount} words</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onDeleteBeat}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
            title="Delete beat card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenBeat(beat.id)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium transition-all"
          >
            <span>Open {beatTypeLabel}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface BeatBoardViewProps {
  parentNode: WorkspaceNode;
  beats: WorkspaceNode[];
  onOpenBeat: (beatId: string) => void;
  beatTypeLabel?: string;
}

export const BeatBoardView: React.FC<BeatBoardViewProps> = ({
  parentNode,
  beats,
  onOpenBeat,
  beatTypeLabel = 'Scene',
}) => {
  const {
    nodes,
    childrenMap,
    shotsByScene,
    updateNodeTitle,
    updateNodeProperties,
    createNewNode,
    deleteNode,
    reorderChildNodes,
  } = useWorkspaceStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = beats.findIndex((b) => b.id === active.id);
    const newIndex = beats.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrdered = arrayMove(beats, oldIndex, newIndex);
    const movedBeat = beats[oldIndex];

    const prevItem = newIndex > 0 ? newOrdered[newIndex - 1] : null;
    const nextItem =
      newIndex < newOrdered.length - 1 ? newOrdered[newIndex + 1] : null;

    const prevRank = prevItem ? prevItem.rank : null;
    const nextRank = nextItem ? nextItem.rank : null;

    const newRank = generateRankBetween(prevRank, nextRank);
    const newOrderedIds = newOrdered.map((b) => b.id);

    await reorderChildNodes(
      parentNode.id,
      newOrderedIds,
      movedBeat.id,
      newRank
    );
  };

  const handleAddBeat = async () => {
    const type = parentNode.type === 'story' ? 'chapter' : 'scene';
    const nextNum = beats.length + 1;
    const title =
      parentNode.type === 'story'
        ? `Chapter ${nextNum}`
        : `SCENE ${nextNum} - INT. LOCATION - DAY`;

    await createNewNode(type, title, parentNode.id);
  };

  const getWordCount = (beatId: string): number => {
    const childIds = childrenMap[beatId] || [];
    const text = childIds
      .map((cid) => nodes[cid]?.content || '')
      .join(' ')
      .trim();
    return text ? text.split(/\s+/).length : 0;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-6 lg:p-10">
      {/* Board Header Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Beat Board: {parentNode.title || 'Overview'}
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {beats.length} {beats.length === 1 ? 'Beat' : 'Beats'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Drag cards to rearrange structural order. Changes sync instantly with deterministic LexoRank.
          </p>
        </div>

        <button
          onClick={handleAddBeat}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Beat</span>
        </button>
      </div>

      {/* Grid of Sortable Cards */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={beats.map((b) => b.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {beats.map((beat, idx) => (
              <SortableBeatCard
                key={beat.id}
                beat={beat}
                index={idx}
                beatTypeLabel={beatTypeLabel}
                wordCount={getWordCount(beat.id)}
                shotCount={shotsByScene[beat.id]?.length || 0}
                onOpenBeat={onOpenBeat}
                onUpdateTitle={(title) => updateNodeTitle(beat.id, title)}
                onUpdateSynopsis={(synopsis) =>
                  updateNodeProperties(beat.id, { synopsis })
                }
                onUpdateMood={(moodId) =>
                  updateNodeProperties(beat.id, { tone: moodId })
                }
                onDeleteBeat={() => deleteNode(beat.id)}
              />
            ))}

            {/* "+ Add Beat" Canvas Card Button */}
            <button
              onClick={handleAddBeat}
              className="flex flex-col items-center justify-center min-h-[260px] rounded-xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/40 text-slate-500 hover:text-cyan-400 transition-all group p-6 space-y-3"
            >
              <div className="p-3 rounded-full bg-slate-900 border border-slate-800 group-hover:border-cyan-500/40 group-hover:scale-110 transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm font-semibold text-slate-300 group-hover:text-cyan-300">
                  + Add New {beatTypeLabel}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Append beat to sequence
                </div>
              </div>
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
