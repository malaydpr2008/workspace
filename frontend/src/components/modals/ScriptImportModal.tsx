'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileCode,
  CheckCircle2,
  Users,
  Film,
  Sparkles,
  Loader2,
  FileText,
} from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { parseFountainScript, ParsedScript } from '@/lib/fountainParser';
import { createNode } from '@/lib/api';

interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenplayNode: WorkspaceNode;
  onImportComplete?: (firstSceneId: string) => void;
}

const SAMPLE_FOUNTAIN = `Title: THE NEON DRIFT
Author: Alex Vance

===

INT. CYBERNETIC WORKSHOP - NIGHT

Sparks cascade from a suspended drone engine. JAX (30s) wipes grease from his augmented optic lens.

JAX
(whispering)
If the core destabilizes now, the whole district goes dark.

A heavy knock rattles the steel door.

KIRA (O.S.)
Jax, open up! Peacekeepers just swept the outer perimeter.

Jax grabs an EMP detonator from the workbench.

JAX
Tell me you brought the decoy encryption key.

KIRA
Better. I brought the real one.

CUT TO:

EXT. SECTOR 4 ROOFTOPS - MOMENTS LATER

Rain slicks the obsidian tiles. Neon billboards reflect across puddles.`;

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({
  isOpen,
  onClose,
  screenplayNode,
  onImportComplete,
}) => {
  const {
    currentWorkspace,
    characters,
    createWorkspaceCharacter,
    loadWorkspace,
    selectNode,
  } = useWorkspaceStore();

  const [scriptText, setScriptText] = useState(SAMPLE_FOUNTAIN);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');

  // Real-time parsed script AST preview
  const parsed: ParsedScript = useMemo(() => {
    return parseFountainScript(scriptText);
  }, [scriptText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setScriptText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!currentWorkspace || parsed.scenes.length === 0) return;

    setIsImporting(true);
    setImportProgress('Registering detected characters...');

    try {
      // 1. Register newly detected characters
      const charMap: Record<string, string> = {}; // name -> id

      // Seed existing characters into map
      Object.values(characters).forEach((c) => {
        charMap[c.name.trim().toUpperCase()] = c.id;
      });

      for (const charName of parsed.characters) {
        const clean = charName.trim().toUpperCase();
        if (!charMap[clean]) {
          setImportProgress(`Registering character: ${clean}...`);
          const created = await createWorkspaceCharacter(clean);
          if (created) {
            charMap[clean] = created.id;
          }
        }
      }

      // 2. Ingest Scenes & Blocks sequentially
      let firstCreatedSceneId = '';

      for (let sIdx = 0; sIdx < parsed.scenes.length; sIdx++) {
        const scene = parsed.scenes[sIdx];
        setImportProgress(`Importing Scene ${sIdx + 1} of ${parsed.scenes.length}: ${scene.title}...`);

        const sceneRank = `0|h${String(sIdx).padStart(4, '0')}:`;

        const createdScene = await createNode({
          workspace: currentWorkspace.id,
          parent: screenplayNode.id,
          type: 'scene',
          title: scene.title,
          rank: sceneRank,
          content: '',
          properties: {},
        });

        if (!firstCreatedSceneId) {
          firstCreatedSceneId = createdScene.id;
        }

        // Create atomic blocks for this scene
        for (let bIdx = 0; bIdx < scene.blocks.length; bIdx++) {
          const block = scene.blocks[bIdx];
          const blockRank = `${sceneRank}h${String(bIdx).padStart(4, '0')}:`;

          const props = { ...block.properties };
          if (block.type === 'dialogue' && block.characterName) {
            const charId = charMap[block.characterName.trim().toUpperCase()];
            if (charId) {
              props.character_id = charId;
            }
          }

          await createNode({
            workspace: currentWorkspace.id,
            parent: createdScene.id,
            type: block.type,
            content: block.content,
            rank: blockRank,
            properties: props,
          });
        }
      }

      setImportProgress('Syncing workspace...');
      await loadWorkspace(currentWorkspace.slug);

      if (firstCreatedSceneId) {
        await selectNode(firstCreatedSceneId);
        if (onImportComplete) {
          onImportComplete(firstCreatedSceneId);
        }
      }

      onClose();
    } catch (err) {
      console.error('Script import failed', err);
      setImportProgress('Import error occurred. Please check console.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide flex items-center space-x-2">
                <span>Fountain Script Importer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  BATCH PARSER
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Paste or upload standard Fountain syntax (.fountain / .txt) to automatically create scenes and dialogue blocks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Parsing Stats Banner */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-cyan-400">
              <Film className="w-3.5 h-3.5" />
              <span>{parsed.scenes.length} Scenes</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1.5 text-amber-400">
              <Users className="w-3.5 h-3.5" />
              <span>{parsed.characters.length} Characters</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1.5 text-slate-300">
              <FileText className="w-3.5 h-3.5" />
              <span>{parsed.totalBlocks} Script Blocks</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload .fountain File</span>
              <input
                type="file"
                accept=".fountain,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>
        </div>

        {/* Body Split: Editor on Left, Live Parsed Preview on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Textarea */}
          <div className="w-1/2 flex flex-col p-4 border-r border-slate-800/80 bg-slate-950/60">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Fountain Source Buffer</span>
              <span className="text-[10px] text-slate-600">Standard plain text</span>
            </div>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Paste Fountain script text here..."
              disabled={isImporting}
              className="flex-1 w-full bg-slate-900/60 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed resize-none focus:outline-none border border-slate-800 focus:border-cyan-500/40 placeholder-slate-600"
            />
          </div>

          {/* Right AST Preview */}
          <div className="w-1/2 flex flex-col p-4 bg-slate-950/40 overflow-y-auto space-y-4">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Detected Hierarchy Preview</span>
            </div>

            {/* Extracted Characters Pills */}
            {parsed.characters.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Identified Cast Registry ({parsed.characters.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.characters.map((char) => (
                    <span
                      key={char}
                      className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-medium"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scene Cards Preview */}
            <div className="space-y-3">
              {parsed.scenes.map((sc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
                    <span className="truncate">{sc.title}</span>
                    <span className="text-[10px] text-cyan-400 font-normal shrink-0 ml-2">
                      {sc.blocks.length} blocks
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-hidden text-[11px] font-mono text-slate-400 opacity-75">
                    {sc.blocks.slice(0, 3).map((b, bIdx) => (
                      <div key={bIdx} className="truncate">
                        {b.type === 'dialogue' ? (
                          <span>
                            <strong className="text-amber-400">{b.characterName}:</strong> {b.content}
                          </span>
                        ) : (
                          <span>{b.content}</span>
                        )}
                      </div>
                    ))}
                    {sc.blocks.length > 3 && (
                      <div className="text-[10px] text-slate-500 italic">
                        + {sc.blocks.length - 3} more blocks
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="text-xs font-mono text-slate-400">
            {isImporting ? (
              <span className="flex items-center space-x-2 text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{importProgress}</span>
              </span>
            ) : (
              <span>Ready to ingest {parsed.scenes.length} scenes into &ldquo;{screenplayNode.title}&rdquo;</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || parsed.scenes.length === 0}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/25 transition-all disabled:opacity-50 active:scale-95"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import {parsed.scenes.length} Scenes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
