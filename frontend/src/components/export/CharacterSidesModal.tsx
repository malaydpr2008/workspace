'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Copy,
  Check,
  FileText,
  FileDown,
  Clapperboard,
} from 'lucide-react';
import { WorkspaceNode, Character } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { downloadFile, copyToClipboard } from '@/lib/compiler';

interface CharacterSidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenplayNode: WorkspaceNode;
  scenes: WorkspaceNode[];
}

export const CharacterSidesModal: React.FC<CharacterSidesModalProps> = ({
  isOpen,
  onClose,
  screenplayNode,
  scenes,
}) => {
  const { characters, nodes, childrenMap } = useWorkspaceStore();

  const characterList = useMemo(() => Object.values(characters), [characters]);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Set default character when list loads
  const activeCharId =
    selectedCharacterId || characterList[0]?.id || '';

  const activeCharacter: Character | null =
    characters[activeCharId] || characterList[0] || null;

  // Filter scenes that contain dialogue for the selected character
  const matchingScenes = useMemo(() => {
    if (!activeCharacter) return [];

    const charName = activeCharacter.name.trim().toUpperCase();

    return scenes.filter((scene) => {
      const blockIds = childrenMap[scene.id] || [];
      return blockIds.some((bid) => {
        const block = nodes[bid];
        if (!block || block.type !== 'dialogue') return false;
        const bCharId = block.properties?.character_id;
        const bCharName = (
          block.properties?.character_name || ''
        ).trim().toUpperCase();
        return bCharId === activeCharacter.id || bCharName === charName;
      });
    });
  }, [activeCharacter, scenes, childrenMap, nodes]);

  // Compute total lines/dialogues for this character
  const totalDialogueCount = useMemo(() => {
    if (!activeCharacter) return 0;
    const charName = activeCharacter.name.trim().toUpperCase();
    let count = 0;
    matchingScenes.forEach((scene) => {
      const blockIds = childrenMap[scene.id] || [];
      blockIds.forEach((bid) => {
        const block = nodes[bid];
        if (block?.type === 'dialogue') {
          const bCharId = block.properties?.character_id;
          const bCharName = (
            block.properties?.character_name || ''
          ).trim().toUpperCase();
          if (bCharId === activeCharacter.id || bCharName === charName) {
            count++;
          }
        }
      });
    });
    return count;
  }, [activeCharacter, matchingScenes, childrenMap, nodes]);

  // Compile raw text / fountain formatted sides
  const compileSidesText = (format: 'fountain' | 'txt'): string => {
    if (!activeCharacter) return '';

    const lines: string[] = [];
    const charName = activeCharacter.name.trim().toUpperCase();

    lines.push(`ACTOR SIDES: ${charName}`);
    lines.push(`PROJECT: ${(screenplayNode.title || 'UNTITLED').toUpperCase()}`);
    lines.push(`DATE: ${new Date().toLocaleDateString()}`);
    lines.push(`TOTAL SCENES: ${matchingScenes.length}`);
    lines.push('========================================');
    lines.push('');

    matchingScenes.forEach((scene) => {
      const heading = (scene.title || 'INT. SCENE - DAY').toUpperCase().trim();
      const fountainHeading = /^(INT|EXT|EST|INT\/EXT|I\/E)\.?/i.test(heading)
        ? heading
        : `.${heading}`;

      lines.push('');
      lines.push(fountainHeading);
      lines.push('');

      const blockIds = childrenMap[scene.id] || [];
      blockIds.forEach((bid) => {
        const block = nodes[bid];
        if (!block) return;

        if (block.type === 'action') {
          if (block.content.trim()) {
            lines.push(block.content.trim());
            lines.push('');
          }
        } else if (block.type === 'dialogue') {
          const bCharId = block.properties?.character_id;
          const bCharName = (
            block.properties?.character_name ||
            (bCharId ? characters[bCharId]?.name : null) ||
            'CHARACTER'
          ).toUpperCase().trim();

          const isActor =
            bCharId === activeCharacter.id || bCharName === charName;

          if (isActor) {
            lines.push(`**${bCharName}** (YOUR LINE)`);
          } else {
            lines.push(`${bCharName} (Cue)`);
          }

          if (block.properties?.parenthetical?.trim()) {
            lines.push(`(${block.properties.parenthetical.trim()})`);
          }

          if (block.content.trim()) {
            lines.push(
              isActor && format === 'txt'
                ? `>>> ${block.content.trim()}`
                : block.content.trim()
            );
          }
          lines.push('');
        }
      });
    });

    return lines.join('\n');
  };

  const handleDownloadFountain = () => {
    if (!activeCharacter) return;
    const content = compileSidesText('fountain');
    const slug = `${activeCharacter.name}-sides`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(content, `${slug}.fountain`, 'text/plain;charset=utf-8');
  };

  const handleDownloadTxt = () => {
    if (!activeCharacter) return;
    const content = compileSidesText('txt');
    const slug = `${activeCharacter.name}-sides`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(content, `${slug}.txt`, 'text/plain;charset=utf-8');
  };

  const handleCopy = async () => {
    const content = compileSidesText('fountain');
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide flex items-center space-x-2">
                <span>Actor Sides Generator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PRINT & AUDITIONS
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Generate tailored script packets highlighting any actor&apos;s lines with scene cues.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Character Selector Bar */}
        <div className="px-6 py-3.5 bg-slate-900/50 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Select Actor / Role:
            </span>
            <select
              value={activeCharId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
            >
              {characterList.length === 0 ? (
                <option value="">No characters found</option>
              ) : (
                characterList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.toUpperCase()}
                  </option>
                ))
              )}
            </select>

            {activeCharacter && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                {matchingScenes.length} Scene{matchingScenes.length === 1 ? '' : 's'} • {totalDialogueCount} Lines
              </span>
            )}
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Sides</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadFountain}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>.fountain</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>.txt</span>
            </button>
          </div>
        </div>

        {/* Sides Script Reader Preview */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-950/80 font-mono text-xs space-y-6">
          {!activeCharacter || matchingScenes.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 space-y-2">
              <Clapperboard className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm text-slate-400">
                No scenes with spoken dialogue found for {activeCharacter?.name || 'this character'}.
              </p>
              <p className="text-xs text-slate-600">
                Ensure character dialogue blocks match this name in the screenplay.
              </p>
            </div>
          ) : (
            matchingScenes.map((scene) => {
              const charName = activeCharacter.name.trim().toUpperCase();
              const blockIds = childrenMap[scene.id] || [];

              return (
                <div
                  key={scene.id}
                  className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-sm"
                >
                  {/* Scene Heading */}
                  <div className="pb-2 border-b border-slate-800 flex items-center justify-between text-slate-200 font-bold uppercase tracking-wider">
                    <span>{scene.title || 'INT. SCENE - DAY'}</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">
                      Contains {activeCharacter.name} dialogue
                    </span>
                  </div>

                  {/* Scene Blocks */}
                  <div className="space-y-3 pl-2">
                    {blockIds.map((bid) => {
                      const block = nodes[bid];
                      if (!block) return null;

                      if (block.type === 'action') {
                        return (
                          <p key={bid} className="text-slate-400 leading-relaxed italic">
                            {block.content}
                          </p>
                        );
                      }

                      if (block.type === 'dialogue') {
                        const bCharId = block.properties?.character_id;
                        const bCharName = (
                          block.properties?.character_name ||
                          (bCharId ? characters[bCharId]?.name : null) ||
                          'CHARACTER'
                        ).toUpperCase().trim();

                        const isActorLine =
                          bCharId === activeCharacter.id ||
                          bCharName === charName;

                        return (
                          <div
                            key={bid}
                            className={`p-3 rounded-lg transition-all ${
                              isActorLine
                                ? 'bg-amber-500/10 border-l-4 border-amber-500 pl-4 text-white shadow-sm'
                                : 'opacity-40 hover:opacity-80 text-slate-400 pl-4 border-l border-slate-800'
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <span
                                className={`font-bold tracking-wider ${
                                  isActorLine
                                    ? 'text-amber-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {bCharName}
                              </span>
                              {isActorLine ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                  YOUR LINE
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-500 font-mono">
                                  Cue
                                </span>
                              )}
                            </div>

                            {block.properties?.parenthetical && (
                              <div className="text-[11px] text-slate-400 italic mb-0.5">
                                ({block.properties.parenthetical})
                              </div>
                            )}

                            <div
                              className={`text-sm leading-relaxed ${
                                isActorLine ? 'font-semibold text-white' : ''
                              }`}
                            >
                              {block.content}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
