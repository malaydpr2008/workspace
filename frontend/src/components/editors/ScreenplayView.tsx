'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clapperboard,
  Film,
  Camera,
  Clock,
  Layers,
  User,
  Plus,
  Trash2,
  Check,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { WorkspaceNode, Shot } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ScreenplayViewProps {
  node: WorkspaceNode;
}

export const ScreenplayView: React.FC<ScreenplayViewProps> = ({ node }) => {
  const {
    nodes,
    childrenMap,
    shotsByScene,
    characters,
    loadSceneShots,
    loadNodeChildren,
    updateNodeContent,
    updateNodeTitle,
    updateNodeProperties,
    changeBlockType,
    insertBlock,
    deleteNode,
    createSceneShot,
    attachBlockToShot,
    saveStatus,
  } = useWorkspaceStore();

  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [userSelectedSceneId, setUserSelectedSceneId] = useState<string | null>(null);

  // New shot form state
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [newShotNumber, setNewShotNumber] = useState('');
  const [newShotType, setNewShotType] = useState('CLOSE-UP');
  const [newShotLens, setNewShotLens] = useState('50mm Anamorphic');
  const [newShotDuration, setNewShotDuration] = useState('3.0');
  const [newShotUrl, setNewShotUrl] = useState('');

  // Refs for focusing after keyboard actions
  const blockInputRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});

  const isScene = node.type === 'scene';

  const scenes: WorkspaceNode[] = useMemo(() => {
    if (isScene) return [node];
    const childIds = childrenMap[node.id] || [];
    return childIds
      .map((cid) => nodes[cid])
      .filter((n): n is WorkspaceNode => n?.type === 'scene');
  }, [isScene, node, childrenMap, nodes]);

  const activeSceneId = isScene
    ? node.id
    : (userSelectedSceneId && scenes.some((s) => s.id === userSelectedSceneId)
        ? userSelectedSceneId
        : scenes[0]?.id) || '';

  useEffect(() => {
    if (activeSceneId) {
      loadSceneShots(activeSceneId);
      if (!childrenMap[activeSceneId]) {
        loadNodeChildren(activeSceneId);
      }
    }
  }, [activeSceneId, loadSceneShots, loadNodeChildren, childrenMap]);

  const currentScene = nodes[activeSceneId] || (isScene ? node : null);
  const sceneBlocks = currentScene
    ? (childrenMap[currentScene.id] || [])
        .map((cid) => nodes[cid])
        .filter((n): n is WorkspaceNode => Boolean(n))
    : [];

  const shots: Shot[] = activeSceneId ? shotsByScene[activeSceneId] || [] : [];
  const activeShot = shots.find((s) => s.id === activeShotId) || shots[0] || null;

  // Set of block IDs covered by the active shot
  const coveredBlockIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeShot?.blocks) {
      activeShot.blocks.forEach((b) => ids.add(b.id));
    }
    return ids;
  }, [activeShot]);

  // Focus helper
  const focusBlock = (blockId: string) => {
    setTimeout(() => {
      blockInputRefs.current[blockId]?.focus();
    }, 50);
  };

  // Keyboard handlers for standard Hollywood script flow
  const handleSceneHeadingKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!currentScene) return;
      const newBlock = await insertBlock(currentScene.id, 'action', null, '');
      if (newBlock) focusBlock(newBlock.id);
    }
  };

  const handleActionKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: WorkspaceNode,
    idx: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!currentScene) return;

      // Enter on empty action converts to character_cue / dialogue
      if (!block.content.trim()) {
        await changeBlockType(block.id, 'dialogue', { character_name: 'CHARACTER' });
        focusBlock(`${block.id}-char`);
        return;
      }

      // Enter on non-empty action creates new action block below
      const newBlock = await insertBlock(currentScene.id, 'action', block.id, '');
      if (newBlock) focusBlock(newBlock.id);
    } else if (e.key === 'Backspace' && !block.content) {
      e.preventDefault();
      const prevBlock = sceneBlocks[idx - 1];
      await deleteNode(block.id);
      if (prevBlock) focusBlock(prevBlock.id);
    }
  };

  const handleDialogueKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: WorkspaceNode,
    idx: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!currentScene) return;

      // Enter on dialogue creates new dialogue with same or new character
      const charName = block.properties?.character_name || 'CHARACTER';
      const newBlock = await insertBlock(currentScene.id, 'dialogue', block.id, '', {
        character_name: charName,
      });
      if (newBlock) focusBlock(`${newBlock.id}-char`);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab toggles or adds parenthetical
      const currentParen = block.properties?.parenthetical || '';
      await updateNodeProperties(block.id, {
        parenthetical: currentParen ? '' : 'whispering',
      });
      if (!currentParen) {
        focusBlock(`${block.id}-paren`);
      }
    } else if (e.key === 'Backspace' && !block.content) {
      e.preventDefault();
      const prevBlock = sceneBlocks[idx - 1];
      await deleteNode(block.id);
      if (prevBlock) focusBlock(prevBlock.id);
    }
  };

  const handleCharacterNameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    block: WorkspaceNode
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusBlock(block.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentParen = block.properties?.parenthetical || '';
      updateNodeProperties(block.id, {
        parenthetical: currentParen ? '' : 'beat',
      });
      focusBlock(`${block.id}-paren`);
    }
  };

  const handleCreateShotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScene || !newShotNumber.trim()) return;

    const shot = await createSceneShot(currentScene.id, {
      shot_number: newShotNumber.trim(),
      shot_type: newShotType,
      lens: newShotLens,
      duration_seconds: parseFloat(newShotDuration) || 3.0,
      storyboard_url: newShotUrl.trim() || undefined,
    });

    if (shot) {
      setActiveShotId(shot.id);
      setNewShotNumber('');
      setIsAddingShot(false);
    }
  };

  const handleToggleCoverage = async (blockId: string) => {
    if (!activeShot || !currentScene) return;
    await attachBlockToShot(activeShot.id, blockId, currentScene.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                {node.title || 'Untitled Screenplay'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SCREENPLAY
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{scenes.length} Scene{scenes.length === 1 ? '' : 's'}</span>
              <span>•</span>
              <span>{shots.length} Shot{shots.length === 1 ? '' : 's'}</span>
              {node.properties?.author && (
                <>
                  <span>•</span>
                  <span>Writer: {node.properties.author}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Status & Scene Selector */}
        <div className="flex items-center space-x-4">
          {/* Live Auto-save indicator */}
          <div className="flex items-center space-x-1.5 text-xs font-mono">
            {saveStatus === 'saving' && (
              <span className="flex items-center space-x-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-slate-500 text-[11px]">Synced</span>
            )}
          </div>

          {/* Scene Selector Pill Switcher */}
          {scenes.length > 1 && (
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {scenes.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => setUserSelectedSceneId(sc.id)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    activeSceneId === sc.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Scene {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Split View: Script Layout on Left, Shot List on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Script Flow (Courier Prime / Monospace standard format) */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 border-r border-slate-800/80 bg-slate-950/40">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Screenplay Heading */}
            {!isScene && (
              <div className="text-center pb-8 border-b border-slate-800/60">
                <h2 className="text-2xl font-mono font-bold tracking-widest text-slate-200 uppercase">
                  {node.title}
                </h2>
                {node.properties?.author && (
                  <p className="text-xs font-mono text-slate-400 mt-2">
                    WRITTEN BY {node.properties.author.toUpperCase()}
                  </p>
                )}
              </div>
            )}

            {/* Current Scene Display */}
            {currentScene ? (
              <div className="space-y-6">
                {/* Scene Heading slugline (Editable) */}
                <div className="group flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/60 transition-all">
                  <div className="flex items-center space-x-2 flex-1 mr-3">
                    <Film className="w-4 h-4 text-rose-400 shrink-0" />
                    <input
                      type="text"
                      value={currentScene.title}
                      onChange={(e) => updateNodeTitle(currentScene.id, e.target.value.toUpperCase())}
                      onKeyDown={handleSceneHeadingKeyDown}
                      placeholder="EXT. NEON ROOFTOP - NIGHT"
                      className="w-full bg-transparent font-mono font-bold text-sm tracking-wide text-white uppercase focus:outline-none placeholder-slate-600"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                    <span>[Enter: +Action]</span>
                    <button
                      onClick={() => insertBlock(currentScene.id, 'action', null, '')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Add Action block at top of scene"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Blocks under this scene */}
                {sceneBlocks.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-xs space-y-3">
                    <p>Scene is empty. Press Enter on heading or click below to start writing.</p>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => insertBlock(currentScene.id, 'action', null, '')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded text-xs"
                      >
                        + Add Action
                      </button>
                      <button
                        onClick={() =>
                          insertBlock(currentScene.id, 'dialogue', null, '', {
                            character_name: 'ELENA',
                          })
                        }
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded text-xs"
                      >
                        + Add Dialogue
                      </button>
                    </div>
                  </div>
                ) : (
                  sceneBlocks.map((block, idx) => {
                    const isCovered = coveredBlockIds.has(block.id);
                    const characterId = block.properties?.character_id;
                    const character = characterId ? characters[characterId] : null;
                    const characterName =
                      block.properties?.character_name || character?.name || 'CHARACTER';

                    if (block.type === 'action') {
                      return (
                        <div
                          key={block.id}
                          className={`group relative p-4 rounded-lg font-mono text-sm leading-relaxed transition-all duration-200 ${
                            isCovered
                              ? 'bg-cyan-950/30 border border-cyan-500/60 shadow-sm shadow-cyan-950 text-cyan-100'
                              : 'text-slate-300 bg-slate-900/20 border border-transparent hover:border-slate-800 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans">
                            <div className="flex items-center space-x-2">
                              <span>Action Block</span>
                              <span className="text-slate-600">•</span>
                              <button
                                onClick={() =>
                                  changeBlockType(block.id, 'dialogue', {
                                    character_name: 'CHARACTER',
                                  })
                                }
                                className="text-slate-500 hover:text-cyan-400 underline decoration-dotted"
                              >
                                Convert to Dialogue
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              {activeShot && (
                                <button
                                  onClick={() => handleToggleCoverage(block.id)}
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                    isCovered
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                  title="Toggle coverage with active shot"
                                >
                                  <LinkIcon className="w-2.5 h-2.5" />
                                  <span>
                                    {isCovered
                                      ? `Covered in Shot ${activeShot.shot_number}`
                                      : `Link to Shot ${activeShot.shot_number}`}
                                  </span>
                                </button>
                              )}
                              <button
                                onClick={() => deleteNode(block.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 p-0.5 transition-opacity"
                                title="Delete block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <textarea
                            ref={(el) => {
                              blockInputRefs.current[block.id] = el;
                            }}
                            value={block.content}
                            onChange={(e) => updateNodeContent(block.id, e.target.value)}
                            onKeyDown={(e) => handleActionKeyDown(e, block, idx)}
                            placeholder="Describe action, movement, or setting..."
                            rows={Math.max(2, block.content.split('\n').length)}
                            className="w-full bg-transparent resize-none focus:outline-none text-slate-200 placeholder-slate-600 leading-relaxed"
                          />
                        </div>
                      );
                    }

                    if (block.type === 'dialogue') {
                      return (
                        <div
                          key={block.id}
                          className={`group relative p-5 rounded-lg transition-all duration-200 ${
                            isCovered
                              ? 'bg-blue-950/40 border border-cyan-400/60 ring-1 ring-cyan-400/20 shadow-lg shadow-cyan-950/40'
                              : 'bg-slate-900/20 border border-transparent hover:border-slate-800 hover:bg-slate-900/40'
                          }`}
                        >
                          {/* Block Header & Action Controls */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-sans">
                            <div className="flex items-center space-x-2">
                              <span>Dialogue Block</span>
                              <span className="text-slate-600">•</span>
                              <button
                                onClick={() => changeBlockType(block.id, 'action')}
                                className="text-slate-500 hover:text-cyan-400 underline decoration-dotted"
                              >
                                Convert to Action
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              {activeShot && (
                                <button
                                  onClick={() => handleToggleCoverage(block.id)}
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                    isCovered
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                  title="Toggle coverage with active shot"
                                >
                                  <LinkIcon className="w-2.5 h-2.5" />
                                  <span>
                                    {isCovered
                                      ? `Covered in Shot ${activeShot.shot_number}`
                                      : `Link to Shot ${activeShot.shot_number}`}
                                  </span>
                                </button>
                              )}
                              <button
                                onClick={() => deleteNode(block.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 p-0.5 transition-opacity"
                                title="Delete block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Character Name in Screenplay Format (Centered / Monospaced Uppercase) */}
                          <div className="text-center">
                            <div className="inline-flex items-center space-x-1.5 font-mono font-bold tracking-widest text-cyan-300 uppercase">
                              <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <input
                                ref={(el) => {
                                  blockInputRefs.current[`${block.id}-char`] = el;
                                }}
                                type="text"
                                value={characterName}
                                onChange={(e) =>
                                  updateNodeProperties(block.id, {
                                    character_name: e.target.value.toUpperCase(),
                                  })
                                }
                                onKeyDown={(e) => handleCharacterNameKeyDown(e, block)}
                                placeholder="CHARACTER NAME"
                                className="bg-transparent text-center focus:outline-none border-b border-dashed border-cyan-500/40 focus:border-cyan-400 text-xs w-44 tracking-widest uppercase font-mono"
                              />
                            </div>

                            {/* Parenthetical (Optional, Tab to toggle) */}
                            {block.properties?.parenthetical !== undefined &&
                              block.properties?.parenthetical !== '' && (
                                <div className="mt-1 text-center">
                                  <span className="text-xs font-mono text-slate-400 italic">
                                    (
                                    <input
                                      ref={(el) => {
                                        blockInputRefs.current[`${block.id}-paren`] = el;
                                      }}
                                      type="text"
                                      value={block.properties.parenthetical}
                                      onChange={(e) =>
                                        updateNodeProperties(block.id, {
                                          parenthetical: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          focusBlock(block.id);
                                        }
                                      }}
                                      placeholder="delivery"
                                      className="bg-transparent text-center focus:outline-none border-b border-dashed border-slate-700 text-xs text-slate-400 italic font-mono w-28"
                                    />
                                    )
                                  </span>
                                </div>
                              )}
                          </div>

                          {/* Dialogue text */}
                          <div className="max-w-md mx-auto mt-2 text-center">
                            <textarea
                              ref={(el) => {
                                blockInputRefs.current[block.id] = el;
                              }}
                              value={block.content}
                              onChange={(e) => updateNodeContent(block.id, e.target.value)}
                              onKeyDown={(e) => handleDialogueKeyDown(e, block, idx)}
                              placeholder="Spoken dialogue line..."
                              rows={Math.max(2, block.content.split('\n').length)}
                              className="w-full bg-transparent resize-none font-mono text-sm text-center leading-relaxed text-slate-200 focus:outline-none placeholder-slate-600"
                            />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={block.id}
                        className="p-3 text-xs font-mono text-slate-400 bg-slate-900/40 rounded border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="uppercase text-slate-500 mr-2">[{block.type}]</span>
                          {block.content || block.title}
                        </div>
                        <button
                          onClick={() => deleteNode(block.id)}
                          className="text-slate-600 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                Select or create a scene to view script flow.
              </div>
            )}
          </div>
        </div>

        {/* Right: Synchronized Shot List & Storyboard Panel */}
        <div className="w-96 flex flex-col bg-slate-950/80 shrink-0 border-l border-slate-800/80">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Production Coverage & Shots
              </h3>
            </div>
            <button
              onClick={() => setIsAddingShot(!isAddingShot)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Shot</span>
            </button>
          </div>

          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/40 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Decoupled coverage layer</span>
            </span>
            <span className="font-mono text-cyan-400">{shots.length} shots</span>
          </div>

          {/* New Shot Creator Form */}
          {isAddingShot && (
            <form
              onSubmit={handleCreateShotSubmit}
              className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3 text-xs animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <span>Create Scene Shot</span>
                <button
                  type="button"
                  onClick={() => setIsAddingShot(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Shot #</label>
                  <input
                    type="text"
                    value={newShotNumber}
                    onChange={(e) => setNewShotNumber(e.target.value.toUpperCase())}
                    placeholder="1B"
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Type</label>
                  <select
                    value={newShotType}
                    onChange={(e) => setNewShotType(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="WIDE">WIDE</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="CLOSE-UP">CLOSE-UP</option>
                    <option value="EXTREME CLOSE-UP">EXTREME CLOSE-UP</option>
                    <option value="OVER THE SHOULDER">OVER THE SHOULDER</option>
                    <option value="POV">POV</option>
                    <option value="TRACKING">TRACKING</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Lens</label>
                  <input
                    type="text"
                    value={newShotLens}
                    onChange={(e) => setNewShotLens(e.target.value)}
                    placeholder="50mm Anamorphic"
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Duration (s)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newShotDuration}
                    onChange={(e) => setNewShotDuration(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase">Storyboard Image URL (optional)</label>
                <input
                  type="url"
                  value={newShotUrl}
                  onChange={(e) => setNewShotUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingShot(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newShotNumber.trim()}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium"
                >
                  Add Shot
                </button>
              </div>
            </form>
          )}

          {/* Shot Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {shots.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-lg">
                <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No shots scheduled for this scene</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click &ldquo;New Shot&rdquo; to add a camera coverage setup.
                </p>
              </div>
            ) : (
              shots.map((shot) => {
                const isSelected = activeShot?.id === shot.id;
                const coveredCount = shot.blocks?.length || 0;

                return (
                  <div
                    key={shot.id}
                    onClick={() => setActiveShotId(shot.id)}
                    className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/20'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    {/* Shot Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          SHOT {shot.shot_number}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                          {shot.shot_type || 'STANDARD'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{shot.duration_seconds}s</span>
                      </div>
                    </div>

                    {/* Storyboard Frame Image */}
                    {shot.storyboard_url ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 mb-2.5 bg-slate-950 group-hover:border-slate-700 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={shot.storyboard_url}
                          alt={`Shot ${shot.shot_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-1.5 left-2 text-[10px] font-mono text-white/90">
                          {shot.lens || 'Prime'}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center mb-2.5">
                        <Camera className="w-6 h-6 text-slate-700" />
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate">{shot.lens || 'Standard Lens'}</span>
                      <span className="text-cyan-400 font-medium">
                        {coveredCount} Block{coveredCount === 1 ? '' : 's'} Covered
                      </span>
                    </div>

                    {/* Covered Blocks Pills */}
                    {isSelected && shot.blocks && shot.blocks.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[10px] font-mono uppercase text-slate-500">Covered script blocks:</div>
                        <div className="space-y-1">
                          {shot.blocks.map((b) => (
                            <div
                              key={b.id}
                              className="text-[11px] font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded truncate border border-slate-800"
                            >
                              <span className="text-cyan-400 uppercase mr-1">[{b.type}]</span>
                              {b.content.slice(0, 32)}...
                            </div>
                          ))}
                        </div>
                      </div>
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
