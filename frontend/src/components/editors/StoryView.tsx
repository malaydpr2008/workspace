'use client';

import React, { useMemo } from 'react';
import {
  BookOpen,
  Network,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Clapperboard,
  MessageSquare,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
} from 'lucide-react';
import { WorkspaceEntity, WorkspaceNode } from '@/types/workspace';
import { useGraphStore, useWorkspaceStore } from '@/lib/workspaceStore';

export interface StoryViewProps {
  node?: WorkspaceNode;
}

export const StoryView: React.FC<StoryViewProps> = ({ node }) => {
  const {
    workspaceId,
    entities,
    nodes,
    updateEntity,
    focusNodeOnGraph,
    syncStatus,
    isSyncing,
    lastSyncedAt,
    syncEntities,
  } = useWorkspaceStore();

  // Sort entities canonically by orderIndex
  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [entities]);

  // Compute stats across entities
  const wordCount = useMemo(() => {
    return sortedEntities.reduce((acc, ent) => {
      const text = `${ent.title || ''} ${ent.content || ''}`.trim();
      if (!text) return acc;
      return acc + text.split(/\s+/).length;
    }, 0);
  }, [sortedEntities]);

  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const handleAddEntity = (entityType: WorkspaceEntity['entityType'] = 'action') => {
    const wsId = workspaceId || 'production-studio';
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ent-${Date.now()}`;
    const maxOrder =
      sortedEntities.length > 0
        ? Math.max(...sortedEntities.map((e) => e.orderIndex))
        : -1;

    let defaultTitle = '';
    let defaultContent = '';

    if (entityType === 'scene_heading') {
      defaultTitle = 'INT. NEW SCENE - DAY';
      defaultContent = 'INT. NEW SCENE - DAY';
    } else if (entityType === 'dialogue') {
      defaultTitle = 'CHARACTER';
      defaultContent = 'Type new spoken line here...';
    } else if (entityType === 'action') {
      defaultContent = 'Describe the action taking place on screen...';
    } else if (entityType === 'note') {
      defaultTitle = 'Production Note';
      defaultContent = 'Add directorial note or context...';
    }

    const newEntity: WorkspaceEntity = {
      id: newId,
      workspaceId: wsId,
      entityType,
      title: defaultTitle,
      content: defaultContent,
      orderIndex: maxOrder + 1,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useGraphStore.setState((state) => ({
      entities: [...state.entities, newEntity],
    }));
    useGraphStore.getState().debouncedSyncEntities();
  };

  const handleDeleteEntity = (id: string) => {
    useGraphStore.setState((state) => ({
      entities: state.entities.filter((e) => e.id !== id),
      nodes: state.nodes.map((n) =>
        n.data?.entityId === id
          ? { ...n, data: { ...n.data, entityId: null, entityType: null } }
          : n
      ),
    }));
    useGraphStore.getState().debouncedSyncEntities();
    useGraphStore.getState().debouncedSyncGraph();
  };

  const handleMoveEntity = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedEntities.length) return;

    const list = [...sortedEntities];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updatedList = list.map((ent, idx) => ({
      ...ent,
      orderIndex: idx,
    }));

    useGraphStore.setState({ entities: updatedList });
    useGraphStore.getState().debouncedSyncEntities();
  };

  const handleExportMarkdown = () => {
    let md = `# Screenplay Manuscript\n\n`;
    for (const ent of sortedEntities) {
      if (ent.entityType === 'scene_heading') {
        md += `\n## ${ent.content || ent.title || 'SCENE HEADING'}\n\n`;
      } else if (ent.entityType === 'dialogue') {
        md += `\n**${ent.title || 'CHARACTER'}**\n${ent.content}\n\n`;
      } else if (ent.entityType === 'action') {
        md += `${ent.content}\n\n`;
      } else if (ent.entityType === 'parenthetical') {
        md += `*(${ent.content || ent.title})*\n\n`;
      } else {
        md += `> [${ent.entityType.toUpperCase()}] ${ent.title ? ent.title + ': ' : ''}${ent.content}\n\n`;
      }
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenplay-manuscript.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                {node?.title || 'Document View • Canonical Screenplay'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                MODEL C CANONICAL
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{sortedEntities.length} Canonical Entities</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{readingTimeMin} min read</span>
              </span>
              <span>•</span>
              <span>{wordCount} words</span>
            </p>
          </div>
        </div>

        {/* Sync Status & Action Bar */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono mr-2">
            {isSyncing || syncStatus === 'saving' ? (
              <span className="flex items-center space-x-1.5 text-amber-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            ) : syncStatus === 'saved' ? (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Backend Synced</span>
              </span>
            ) : syncStatus === 'error' ? (
              <span className="flex items-center space-x-1.5 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sync Error</span>
              </span>
            ) : (
              <span className="text-slate-500 text-[11px]">
                {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString()}` : 'Ready'}
              </span>
            )}
          </div>

          <button
            onClick={() => syncEntities()}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Manual sync entities"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors"
            title="Export manuscript as Markdown"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export MD</span>
          </button>
        </div>
      </div>

      {/* Main Manuscript Reader & Editor */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 bg-slate-950 flex justify-center">
        <div className="max-w-3xl w-full space-y-6">
          {/* Document Header Banner */}
          <div className="text-center pb-6 border-b border-slate-800/60 space-y-2">
            <span className="text-[11px] font-mono tracking-widest text-indigo-400 uppercase">
              LINEAR SCREENPLAY CONTINUUM
            </span>
            <h2 className="text-2xl md:text-3xl font-serif text-slate-100 font-semibold tracking-wide">
              {node?.title || 'Production Screenplay'}
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Linear sequence sorted by <code className="text-indigo-300 font-mono">order_index</code>. Edits synchronize reactively with linked cards on the Infinite Visual Graph.
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto mt-4" />
          </div>

          {/* Quick Add Bar */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 backdrop-blur px-4">
            <span className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Insert Entity:</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleAddEntity('scene_heading')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/40 hover:text-amber-300 hover:border-amber-500/40 border border-slate-700/60 text-[11px] font-mono text-slate-300 transition-colors"
              >
                + Scene Heading
              </button>
              <button
                onClick={() => handleAddEntity('action')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-500/40 border border-slate-700/60 text-[11px] font-mono text-slate-300 transition-colors"
              >
                + Action
              </button>
              <button
                onClick={() => handleAddEntity('dialogue')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-950/40 hover:text-indigo-300 hover:border-indigo-500/40 border border-slate-700/60 text-[11px] font-mono text-slate-300 transition-colors"
              >
                + Dialogue
              </button>
              <button
                onClick={() => handleAddEntity('note')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950/40 hover:text-purple-300 hover:border-purple-500/40 border border-slate-700/60 text-[11px] font-mono text-slate-300 transition-colors"
              >
                + Note
              </button>
            </div>
          </div>

          {/* Canonical Entities Dynamic List */}
          {sortedEntities.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-slate-400 space-y-4">
              <Layers className="w-8 h-8 mx-auto text-slate-600" />
              <div>
                <p className="text-sm font-semibold text-slate-200">No entities in canonical store</p>
                <p className="text-xs text-slate-500 mt-1">
                  Create an entity or load the seeded cyberpunk screenplay from Django.
                </p>
              </div>
              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => handleAddEntity('scene_heading')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-all flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Scene</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEntities.map((entity, idx) => {
                const linkedNode = nodes.find(
                  (n) => n.data?.entityId === entity.id || n.id === entity.id
                );

                return (
                  <div
                    key={entity.id}
                    className="group relative bg-slate-900/70 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl p-5 transition-all shadow-sm hover:shadow-md"
                  >
                    {/* Block Header: Type Badge, Linked Node Indicator, Reordering, and Focus Button */}
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800/60">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        {/* Entity Type Badge */}
                        {entity.entityType === 'scene_heading' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                            <Clapperboard className="w-3 h-3 text-amber-400" />
                            <span>Scene Heading</span>
                          </span>
                        )}
                        {entity.entityType === 'action' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span>Action</span>
                          </span>
                        )}
                        {entity.entityType === 'dialogue' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3 text-indigo-400" />
                            <span>Dialogue</span>
                          </span>
                        )}
                        {entity.entityType === 'note' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>Production Note</span>
                          </span>
                        )}
                        {entity.entityType !== 'scene_heading' &&
                          entity.entityType !== 'action' &&
                          entity.entityType !== 'dialogue' &&
                          entity.entityType !== 'note' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {entity.entityType}
                            </span>
                          )}

                        {/* Order Index */}
                        <span className="text-[11px] font-mono text-slate-500">
                          #{entity.orderIndex}
                        </span>

                        {/* Linked Node Badge */}
                        {linkedNode ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            <span>Canvas Node: {linkedNode.data?.title || linkedNode.id.slice(0, 8)}</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-800">
                            Unlinked Card
                          </span>
                        )}
                      </div>

                      {/* Right Actions: Focus on Graph Canvas + Reorder + Delete */}
                      <div className="flex items-center space-x-1.5">
                        {/* Focus on Graph Canvas Button */}
                        <button
                          onClick={() => focusNodeOnGraph(entity.id)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 hover:border-indigo-400 text-xs font-mono transition-all shadow-sm"
                          title="Switch to Visual Graph and pan directly to linked node"
                        >
                          <Network className="w-3.5 h-3.5 text-indigo-300" />
                          <span>Focus on Graph Canvas</span>
                        </button>

                        {/* Reorder Buttons */}
                        <button
                          onClick={() => handleMoveEntity(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move entity up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveEntity(idx, 'down')}
                          disabled={idx === sortedEntities.length - 1}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move entity down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteEntity(entity.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-500 transition-colors"
                          title="Delete entity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Entity Content: Tailored Screenplay Formatting & Inline Editing */}
                    {entity.entityType === 'dialogue' ? (
                      <div className="space-y-2">
                        {/* Speaker Name Input */}
                        <div className="flex justify-center">
                          <input
                            type="text"
                            value={entity.title}
                            onChange={(e) =>
                              updateEntity(entity.id, { title: e.target.value.toUpperCase() })
                            }
                            placeholder="CHARACTER NAME"
                            className="text-center font-mono font-bold text-sm tracking-wider text-indigo-300 bg-transparent border-b border-indigo-500/30 focus:border-indigo-400 focus:outline-none px-3 py-0.5 uppercase transition-colors"
                          />
                        </div>

                        {/* Spoken Dialogue Textarea */}
                        <div className="max-w-xl mx-auto">
                          <textarea
                            value={entity.content}
                            onChange={(e) =>
                              updateEntity(entity.id, { content: e.target.value })
                            }
                            placeholder="Type dialogue lines..."
                            rows={Math.max(2, entity.content.split('\n').length)}
                            className="w-full bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 font-serif text-base text-slate-100 focus:outline-none focus:border-indigo-500/60 resize-none transition-all"
                          />
                        </div>
                      </div>
                    ) : entity.entityType === 'scene_heading' ? (
                      <div>
                        <input
                          type="text"
                          value={entity.title || entity.content}
                          onChange={(e) =>
                            updateEntity(entity.id, {
                              title: e.target.value.toUpperCase(),
                              content: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="INT. CYBERPUNK LAB - NIGHT"
                          className="w-full bg-slate-950/60 border border-amber-500/30 rounded-lg px-3.5 py-2 font-mono font-bold text-sm text-amber-300 focus:outline-none focus:border-amber-400 uppercase tracking-wide transition-colors"
                        />
                      </div>
                    ) : entity.entityType === 'action' ? (
                      <div>
                        <textarea
                          value={entity.content}
                          onChange={(e) =>
                            updateEntity(entity.id, { content: e.target.value })
                          }
                          placeholder="Action description..."
                          rows={Math.max(2, entity.content.split('\n').length)}
                          className="w-full bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 font-serif text-base text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500/60 resize-none transition-all"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {entity.title && (
                          <input
                            type="text"
                            value={entity.title}
                            onChange={(e) =>
                              updateEntity(entity.id, { title: e.target.value })
                            }
                            placeholder="Title..."
                            className="w-full bg-slate-950/40 border border-slate-800/80 rounded px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        )}
                        <textarea
                          value={entity.content}
                          onChange={(e) =>
                            updateEntity(entity.id, { content: e.target.value })
                          }
                          placeholder="Content..."
                          rows={Math.max(2, entity.content.split('\n').length)}
                          className="w-full bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Insertion Bar */}
          {sortedEntities.length > 0 && (
            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>End of Manuscript Continuum</span>
              </span>
              <button
                onClick={() => handleAddEntity('dialogue')}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Dialogue Block</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryView;
