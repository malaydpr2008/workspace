'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Check, Tag } from 'lucide-react';
import { BreakdownCategory } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CATEGORY_CONFIGS, BreakdownBadge } from './BreakdownBadge';

interface BreakdownTagPopoverProps {
  blockId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: BreakdownCategory;
  initialName?: string;
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

export const BreakdownTagPopover: React.FC<BreakdownTagPopoverProps> = ({
  blockId,
  isOpen,
  onClose,
  defaultCategory = 'PROP',
  initialName = '',
}) => {
  const {
    breakdownElements,
    addBreakdownElement,
    tagBlockWithElement,
    untagBlockFromElement,
  } = useWorkspaceStore();

  const [category, setCategory] = useState<BreakdownCategory>(defaultCategory);
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(isOpen);

  // Adjust state during render when isOpen changes
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setName(initialName);
    setNotes('');
  }

  const popoverRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Elements currently tagged to this block
  const taggedElements = Object.values(breakdownElements).filter((el) =>
    el.block_ids?.includes(blockId)
  );

  // Existing elements in the workspace of the selected category, not yet tagged
  const existingCategoryElements = Object.values(breakdownElements).filter(
    (el) => el.category === category && !el.block_ids?.includes(blockId)
  );

  // Filtered by name query
  const suggestions = existingCategoryElements.filter((el) =>
    el.name.toLowerCase().includes(name.trim().toLowerCase())
  );

  const handleSelectExisting = async (elementId: string) => {
    setIsSubmitting(true);
    try {
      await tagBlockWithElement(blockId, elementId);
      setName('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Check if element with same name & category already exists
      const existing = Object.values(breakdownElements).find(
        (el) =>
          el.category === category &&
          el.name.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        await tagBlockWithElement(blockId, existing.id);
      } else {
        await addBreakdownElement({
          category,
          name: trimmed,
          notes: notes.trim(),
          block_ids: [blockId],
        });
      }

      setName('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Failed to create/tag element', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-7 z-50 w-80 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 p-3.5 text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-white tracking-wide">
          <Tag className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tag Production Element</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Already Tagged Elements */}
      {taggedElements.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5">
            Tagged in this block:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {taggedElements.map((el) => (
              <BreakdownBadge
                key={el.id}
                element={el}
                onRemove={() => untagBlockFromElement(blockId, el.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="mb-3">
        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5">
          Category:
        </div>
        <div className="grid grid-cols-4 gap-1">
          {CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIGS[cat];
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex items-center justify-center space-x-1 py-1 px-1.5 rounded-lg text-[10px] font-mono font-medium transition-all ${
                  isSelected
                    ? `${config.badgeClass} ring-1 ring-white/20 shadow-sm font-semibold`
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                <span className="truncate">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tag Input Form */}
      <form onSubmit={handleSubmitNew} className="space-y-2">
        <div>
          <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
            Element Name:
          </label>
          <div className="relative">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. "Vintage Revolver", "Neon Trenchcoat"`}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* Existing element suggestions dropdown if matching */}
        {name.trim() && suggestions.length > 0 && (
          <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-1 space-y-0.5">
            <div className="text-[9px] uppercase font-mono text-slate-500 px-1.5 py-0.5">
              Existing in workspace:
            </div>
            {suggestions.map((el) => (
              <button
                key={el.id}
                type="button"
                onClick={() => handleSelectExisting(el.id)}
                className="w-full text-left flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <span className="truncate font-mono">{el.name}</span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center space-x-0.5">
                  <Plus className="w-2.5 h-2.5" />
                  <span>Attach</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
            Notes (Optional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Needs blood rig, scene 2 prop"
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-500 font-mono">
            {name.trim() ? `Press Enter or click Add` : `Type name to tag`}
          </span>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="flex items-center space-x-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-mono font-medium shadow transition-colors"
          >
            <Check className="w-3 h-3" />
            <span>Tag Element</span>
          </button>
        </div>
      </form>
    </div>
  );
};
