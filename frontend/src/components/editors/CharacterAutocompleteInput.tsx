'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Plus, Sparkles, Check } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Character } from '@/types/workspace';

interface CharacterAutocompleteInputProps {
  blockId: string;
  characterName: string;
  characterId?: string;
  onSelectCharacter: (char: { id: string; name: string }) => void;
  onEnterToDialogue: () => void;
  onTabToParenthetical: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
}

export const CharacterAutocompleteInput: React.FC<CharacterAutocompleteInputProps> = ({
  characterName,
  characterId,
  onSelectCharacter,
  onEnterToDialogue,
  onTabToParenthetical,
  inputRef,
}) => {
  const { characters, createWorkspaceCharacter } = useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  const characterList: Character[] = useMemo(() => {
    return Object.values(characters);
  }, [characters]);

  const query = characterName.trim().toUpperCase();

  const filteredCharacters = useMemo(() => {
    if (!query) return characterList;
    return characterList.filter((c) =>
      c.name.toUpperCase().includes(query)
    );
  }, [characterList, query]);

  const hasExactMatch = useMemo(() => {
    return characterList.some((c) => c.name.toUpperCase() === query);
  }, [characterList, query]);

  const canAddNew = query.length > 0 && !hasExactMatch;
  const totalOptions = filteredCharacters.length + (canAddNew ? 1 : 0);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSelect = (char: Character) => {
    onSelectCharacter({ id: char.id, name: char.name.toUpperCase() });
    setIsOpen(false);
    onEnterToDialogue();
  };

  const handleAddNew = async () => {
    if (!query) return;
    const created = await createWorkspaceCharacter(query);
    if (created) {
      handleSelect(created);
    } else {
      onSelectCharacter({ id: '', name: query });
      setIsOpen(false);
      onEnterToDialogue();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, totalOptions));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev - 1 + totalOptions) % Math.max(1, totalOptions));
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && totalOptions > 0) {
        if (highlightedIndex < filteredCharacters.length) {
          handleSelect(filteredCharacters[highlightedIndex]);
        } else if (canAddNew) {
          handleAddNew();
        }
      } else {
        setIsOpen(false);
        onEnterToDialogue();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      setIsOpen(false);
      onTabToParenthetical();
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-center">
      <div className="inline-flex items-center space-x-1.5 font-mono font-bold tracking-widest text-cyan-300 uppercase">
        <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <input
          ref={(el) => {
            localInputRef.current = el;
            if (inputRef) inputRef(el);
          }}
          type="text"
          value={characterName}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            onSelectCharacter({
              id: characterId || '',
              name: e.target.value.toUpperCase(),
            });
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="CHARACTER NAME"
          className="bg-transparent text-center focus:outline-none border-b border-dashed border-cyan-500/40 focus:border-cyan-400 text-xs w-44 tracking-widest uppercase font-mono"
        />
      </div>

      {/* Floating Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-1.5 space-y-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100 font-sans">
          <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Character Registry</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {filteredCharacters.map((char, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isCurrent = char.id === characterId;

              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelect(char)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    isHighlighted
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <User className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="font-bold tracking-wide truncate">{char.name}</span>
                  </div>
                  {isCurrent && <Check className="w-3.5 h-3.5 shrink-0 opacity-80 ml-1" />}
                </button>
              );
            })}

            {canAddNew && (
              <button
                type="button"
                onClick={handleAddNew}
                onMouseEnter={() => setHighlightedIndex(filteredCharacters.length)}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors border-t border-slate-800 mt-1 pt-1.5 ${
                  highlightedIndex === filteredCharacters.length
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Add &ldquo;{query}&rdquo; to Registry</span>
              </button>
            )}

            {totalOptions === 0 && (
              <div className="px-3 py-3 text-center text-slate-500 text-xs">
                No characters registered yet. Type a name to add.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
