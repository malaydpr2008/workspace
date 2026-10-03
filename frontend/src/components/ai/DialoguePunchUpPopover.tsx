'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, X, RefreshCw, Zap, MessageCircle, CloudRain, Flame } from 'lucide-react';
import { requestDialoguePunchUp } from '@/lib/api';
import { DialoguePunchUpSuggestion } from '@/types/workspace';

interface DialoguePunchUpPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
  initialText: string;
  characterName?: string;
  onApplyVariation: (variationText: string) => void;
}

type PunchUpTone = 'SHARPER' | 'SUBTEXT' | 'CYNICAL' | 'URGENT';

const TONES: { id: PunchUpTone; label: string; icon: React.ReactNode; color: string; badge: string }[] = [
  {
    id: 'SHARPER',
    label: 'Punchier & Sharper',
    icon: <Zap className="w-3 h-3 text-amber-400" />,
    color: 'border-amber-500/40 text-amber-300',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  {
    id: 'SUBTEXT',
    label: 'Subtext & Restraint',
    icon: <MessageCircle className="w-3 h-3 text-violet-400" />,
    color: 'border-violet-500/40 text-violet-300',
    badge: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  },
  {
    id: 'CYNICAL',
    label: 'Cynical & Noir',
    icon: <CloudRain className="w-3 h-3 text-sky-400" />,
    color: 'border-sky-500/40 text-sky-300',
    badge: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  {
    id: 'URGENT',
    label: 'Urgent & High Stakes',
    icon: <Flame className="w-3 h-3 text-rose-400" />,
    color: 'border-rose-500/40 text-rose-300',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
];

export function DialoguePunchUpPopover({
  isOpen,
  onClose,
  blockId,
  initialText,
  characterName = 'CHARACTER',
  onApplyVariation,
}: DialoguePunchUpPopoverProps) {
  const [selectedTone, setSelectedTone] = useState<PunchUpTone>('SHARPER');
  const [suggestions, setSuggestions] = useState<DialoguePunchUpSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchSuggestions() {
      setIsLoading(true);
      try {
        const results = await requestDialoguePunchUp(blockId, selectedTone);
        if (isMounted) {
          setSuggestions(results);
        }
      } catch (err) {
        console.error('Failed to punch up dialogue', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchSuggestions();
    return () => {
      isMounted = false;
    };
  }, [isOpen, blockId, selectedTone]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-10 z-40 w-96 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 font-sans text-xs animate-in fade-in zoom-in-95 duration-150"
      style={{ minWidth: '340px' }}
      role="dialog"
      aria-label="Dialogue Doctor"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 flex items-center gap-1.5 font-mono text-[11px]">
              Dialogue Doctor
              <span className="text-[10px] text-slate-400 font-normal">
                ({characterName})
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">Contextual line punch-ups & voice refinement</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Original Line Preview */}
      <div className="my-2.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-slate-400">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5 font-sans font-bold">
          Current Line
        </span>
        <p className="italic text-slate-300">&ldquo;{initialText}&rdquo;</p>
      </div>

      {/* Tone Selector Pills */}
      <div className="space-y-1 mb-3">
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">
          Desired Tone
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {TONES.map((tone) => {
            const active = selectedTone === tone.id;
            return (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
                className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-mono transition-all text-left ${
                  active
                    ? 'bg-slate-800 text-white border-slate-600 font-bold shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-800/60'
                }`}
              >
                <span>{tone.icon}</span>
                <span className="truncate">{tone.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 scrollbar-thin">
        {isLoading ? (
          <div className="h-28 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span className="text-[11px] font-mono text-slate-400">Consulting Dialogue Doctor...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-[11px]">
            No variations returned for this tone.
          </div>
        ) : (
          suggestions.map((suggestion, idx) => {
            const isApplied = appliedIndex === idx;
            return (
              <div
                key={idx}
                className="group relative p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <p className="font-mono text-xs text-slate-100 font-medium leading-relaxed mb-1.5">
                  &ldquo;{suggestion.variation}&rdquo;
                </p>
                <p className="text-[10px] text-slate-400 leading-normal mb-2">
                  {suggestion.rationale}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Option {idx + 1}
                  </span>
                  <button
                    onClick={() => {
                      setAppliedIndex(idx);
                      onApplyVariation(suggestion.variation);
                      setTimeout(() => {
                        onClose();
                      }, 250);
                    }}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                      isApplied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>{isApplied ? 'Applied!' : 'Apply to Script'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
