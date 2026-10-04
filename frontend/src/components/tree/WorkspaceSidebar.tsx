'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Clapperboard,
  BookOpen,
  FileText,
  FolderPlus,
  Search,
  Film,
  Camera,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { TreeNodeItem } from './TreeNodeItem';
import { NodeType, WorkspaceNode } from '@/types/workspace';

export const WorkspaceSidebar: React.FC = () => {
  const {
    currentWorkspace,
    rootNodeIds,
    nodes,
    childrenMap,
    shotsByScene,
    selectedNodeId,
    selectNode,
    createNewNode,
    isLoading,
    setIsProjectModalOpen,
    loadNodeChildren,
  } = useWorkspaceStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedType, setSelectedType] = useState<NodeType>('screenplay');
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedSceneIds, setExpandedSceneIds] = useState<Record<string, boolean>>({});

  const isFilmProject = currentWorkspace?.project_type === 'film';

  // Screenplay Root Node
  const screenplayRoot = useMemo(() => {
    return Object.values(nodes).find((n) => n.type === 'screenplay' && !n.parent) ||
      Object.values(nodes).find((n) => n.type === 'screenplay') || null;
  }, [nodes]);

  useEffect(() => {
    if (isFilmProject && screenplayRoot && !childrenMap[screenplayRoot.id]) {
      loadNodeChildren(screenplayRoot.id);
    }
  }, [isFilmProject, screenplayRoot, childrenMap, loadNodeChildren]);

  // Derived Chronological Scenes Spine
  const sceneNodes: WorkspaceNode[] = useMemo(() => {
    if (!isFilmProject) return [];

    let scenes: WorkspaceNode[] = [];
    if (screenplayRoot && childrenMap[screenplayRoot.id]) {
      const childIds = childrenMap[screenplayRoot.id] || [];
      scenes = childIds
        .map((cid) => nodes[cid])
        .filter((n): n is WorkspaceNode => Boolean(n && n.type === 'scene'));
    } else {
      scenes = Object.values(nodes).filter((n) => n.type === 'scene');
    }

    // Sort by rank string
    return [...scenes].sort((a, b) => (a.rank || '').localeCompare(b.rank || ''));
  }, [isFilmProject, screenplayRoot, childrenMap, nodes]);

  const filteredScenes = useMemo(() => {
    if (!searchFilter.trim()) return sceneNodes;
    const q = searchFilter.toLowerCase();
    return sceneNodes.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.properties?.scene_number && String(s.properties.scene_number).includes(q))
    );
  }, [sceneNodes, searchFilter]);

  const toggleSceneExpand = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSceneIds((prev) => ({
      ...prev,
      [sceneId]: !prev[sceneId],
    }));
  };

  const handleAddScene = async () => {
    const parentId = screenplayRoot?.id || rootNodeIds[0] || null;
    const nextNumber = sceneNodes.length + 1;
    const slugline = `SCENE ${nextNumber} - EXT. NEW LOCATION - DAY`;

    const created = await createNewNode('scene', slugline, parentId);
    if (created) {
      await selectNode(created.id);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createNewNode(selectedType, newTitle.trim(), null);
    setNewTitle('');
    setIsCreateOpen(false);
  };

  const getProjectIcon = () => {
    switch (currentWorkspace?.project_type) {
      case 'novel':
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      case 'article':
        return <FileText className="w-4 h-4 text-violet-400" />;
      case 'film':
      default:
        return <Film className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <aside className="w-72 h-screen flex flex-col bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-md select-none shrink-0 text-slate-200">
      {/* Top Header: Project Identity Banner */}
      <div className="p-3.5 border-b border-slate-800/70 bg-slate-950 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            {getProjectIcon()}
          </div>
          <div className="truncate">
            <h2 className="text-xs font-bold text-white tracking-tight truncate">
              {currentWorkspace ? currentWorkspace.name : 'Loading Studio...'}
            </h2>
            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="uppercase tracking-wider">
                {currentWorkspace?.project_type === 'film'
                  ? 'Film Studio'
                  : currentWorkspace?.project_type === 'novel'
                  ? 'Novel Studio'
                  : currentWorkspace?.project_type === 'article'
                  ? 'Article Codex'
                  : 'Studio'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter & Quick Actions */}
      <div className="p-3 border-b border-slate-800/60 space-y-2 shrink-0 bg-slate-950/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder={isFilmProject ? 'Filter scene spine...' : 'Search hierarchy...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>

        {isFilmProject ? (
          <button
            onClick={handleAddScene}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-medium shadow-md shadow-cyan-950/40 transition-all"
            title="Append a new scene to the screenplay"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Scene</span>
          </button>
        ) : (
          <button
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg text-xs font-medium shadow-md shadow-cyan-900/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Document</span>
          </button>
        )}
      </div>

      {/* New Root Document Creator Panel (For Novel/Article mode) */}
      {!isFilmProject && isCreateOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-3 bg-slate-900/90 border-b border-slate-800 text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0"
        >
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider font-mono">
            Create Root Document
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedType('screenplay')}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded text-left transition-all ${
                selectedType === 'screenplay'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Clapperboard className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Screenplay</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('story')}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded text-left transition-all ${
                selectedType === 'story'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3 h-3 text-violet-400 shrink-0" />
              <span className="truncate">Story</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('article')}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded text-left transition-all ${
                selectedType === 'article'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Article</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('folder')}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded text-left transition-all ${
                selectedType === 'folder'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FolderPlus className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Folder</span>
            </button>
          </div>

          <input
            type="text"
            placeholder="Document title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            autoFocus
          />

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-2 py-1 text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-medium"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Main Outliner Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1 custom-scrollbar">
        {isLoading && rootNodeIds.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
            Loading studio...
          </div>
        ) : isFilmProject ? (
          /* ========================================================= */
          /* FILM STUDIO: Dedicated Chronological Scene Spine Outliner */
          /* ========================================================= */
          <div>
            <div className="px-2 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Scene Spine</span>
              <span>{filteredScenes.length} Scenes</span>
            </div>

            {filteredScenes.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-slate-500 font-mono">
                No scenes yet. Click <span className="text-cyan-400">+ Add Scene</span> to draft.
              </div>
            ) : (
              filteredScenes.map((scene, idx) => {
                const isSelected = selectedNodeId === scene.id;
                const shotCount = shotsByScene[scene.id]?.length || 0;
                const isExpanded = Boolean(expandedSceneIds[scene.id]);
                const childBlockIds = childrenMap[scene.id] || [];
                const sceneNumber = scene.properties?.scene_number || String(idx + 1);

                return (
                  <div key={scene.id} className="space-y-0.5 mb-1">
                    {/* Scene Item Row */}
                    <div
                      onClick={() => selectNode(scene.id)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-cyan-950/40 text-cyan-200 border-cyan-500/50 shadow-sm shadow-cyan-950/50'
                          : 'bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        {/* Expand Beats Toggle */}
                        {childBlockIds.length > 0 ? (
                          <button
                            onClick={(e) => toggleSceneExpand(scene.id, e)}
                            className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-3.5" />
                        )}

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold shrink-0">
                          #{sceneNumber}
                        </span>

                        <span className="text-xs font-mono font-medium truncate tracking-tight">
                          {scene.title || 'UNTITLED SCENE'}
                        </span>
                      </div>

                      {/* Shot Count Badge */}
                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        {shotCount > 0 ? (
                          <span
                            className="flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60"
                            title={`${shotCount} Camera Setups`}
                          >
                            <Camera className="w-2.5 h-2.5" />
                            <span>{shotCount}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-600 group-hover:text-slate-500">
                            0 shots
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Direct Child Beats (Action / Dialogue) */}
                    {isExpanded && childBlockIds.length > 0 && (
                      <div className="ml-5 pl-2 border-l border-slate-800 space-y-0.5 py-1">
                        {childBlockIds.map((cid) => {
                          const child = nodes[cid];
                          if (!child) return null;
                          const isChildSelected = selectedNodeId === child.id;

                          return (
                            <div
                              key={child.id}
                              onClick={() => selectNode(child.id)}
                              className={`flex items-center space-x-2 px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors truncate ${
                                isChildSelected
                                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                              }`}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 shrink-0">
                                {child.type === 'dialogue' ? '🗣️' : '🎬'}
                              </span>
                              <span className="truncate">
                                {child.type === 'dialogue'
                                  ? child.properties?.character_name || 'Dialogue'
                                  : child.content
                                  ? child.content.slice(0, 32)
                                  : 'Action Beat'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* NOVEL / ARTICLE STUDIO: Hierarchical Document Tree       */
          /* ========================================================= */
          <div>
            <div className="px-2 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Document Hierarchy
            </div>
            {rootNodeIds.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                No root documents found.
              </div>
            ) : (
              rootNodeIds.map((rootId) => (
                <TreeNodeItem key={rootId} nodeId={rootId} level={0} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* BOTTOM FOOTER: Compact Godot-Style Project Manager Bar     */}
      {/* ========================================================= */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/95 shrink-0">
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-xs font-mono transition-all group shadow-sm"
          title="Open Godot-Style Project Manager (Ctrl+P / Cmd+P)"
        >
          <span className="flex items-center gap-2 truncate">
            <span>{currentWorkspace?.project_type === 'novel' ? '📖' : currentWorkspace?.project_type === 'article' ? '📄' : '🎬'}</span>
            <span className="font-semibold text-slate-200 group-hover:text-white truncate">
              {currentWorkspace ? currentWorkspace.name : 'Select Project'}
            </span>
          </span>
          <span className="text-[11px] text-cyan-400 group-hover:text-cyan-300 font-sans flex items-center gap-1 shrink-0 ml-1">
            <span>Switch</span>
            <span className="text-xs font-bold">⤹</span>
          </span>
        </button>
      </div>
    </aside>
  );
};
