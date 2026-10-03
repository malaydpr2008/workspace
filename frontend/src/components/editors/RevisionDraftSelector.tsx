'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock, Unlock } from 'lucide-react';
import { RevisionColor } from '@/types/workspace';
import { REVISION_COLORS, getRevisionConfig } from '@/lib/revision';

interface RevisionDraftSelectorProps {
  activeColor?: RevisionColor;
  onSelectColor: (color: RevisionColor) => void;
  isLocked?: boolean;
  onToggleLock: () => void;
  canLock?: boolean;
}

export const RevisionDraftSelector: React.FC<RevisionDraftSelectorProps> = ({
  activeColor = 'WHITE',
  onSelectColor,
  isLocked = false,
  onToggleLock,
  canLock = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig = getRevisionConfig(activeColor);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="flex items-center space-x-2">
      {/* Draft Color Dropdown */}
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all shadow-sm ${activeConfig.badgeBg} ${activeConfig.badgeBorder}`}
          title="Switch Hollywood Script Revision Draft Color"
        >
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
            style={{ backgroundColor: activeConfig.hex }}
          />
          <span className="font-semibold">{activeConfig.label} Draft</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-1.5 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="px-2.5 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
              Hollywood Revision Drafts
            </div>

            <div className="max-h-72 overflow-y-auto space-y-0.5 py-1">
              {REVISION_COLORS.map((rev) => {
                const isSelected = rev.id === activeColor;
                return (
                  <button
                    key={rev.id}
                    onClick={() => {
                      onSelectColor(rev.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors font-mono ${
                      isSelected
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: rev.hex }}
                      />
                      <span className="text-xs">{rev.draftName}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold text-cyan-400">Active</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lock Scene Numbers Toggle */}
      <button
        onClick={canLock ? onToggleLock : undefined}
        disabled={!canLock}
        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
          !canLock
            ? 'opacity-40 cursor-not-allowed bg-slate-900/40 text-slate-500 border-slate-800'
            : isLocked
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-sm'
            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
        }`}
        title={
          !canLock
            ? 'Permission Locked: Only Directors, Producers, or Studio Owners can lock scene numbers'
            : isLocked
            ? 'Scene Numbers Locked: Inserted scenes will use alphanumeric numbering (1A, 1B)'
            : 'Click to Lock Scene Numbers for Pre-Production'
        }
      >
        {isLocked ? (
          <>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Scenes Locked</span>
          </>
        ) : (
          <>
            <Unlock className="w-3.5 h-3.5 opacity-70" />
            <span>Lock Scenes</span>
          </>
        )}
      </button>
    </div>
  );
};
