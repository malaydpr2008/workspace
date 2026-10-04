'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Clapperboard,
  BookOpen,
  FileText,
  FolderPlus,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { TreeNodeItem } from './TreeNodeItem';
import { NodeType, Workspace } from '@/types/workspace';
import { fetchWorkspaces } from '@/lib/api';

export const WorkspaceSidebar: React.FC = () => {
  const {
    currentWorkspace,
    rootNodeIds,
    createNewNode,
    switchWorkspace,
    isLoading,
  } = useWorkspaceStore();

  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedType, setSelectedType] = useState<NodeType>('screenplay');
  const [searchFilter, setSearchFilter] = useState('');

  const toggleSwitcher = async () => {
    if (!isSwitcherOpen) {
      try {
        const list = await fetchWorkspaces();
        setAvailableWorkspaces(list);
      } catch (err) {
        console.warn('Failed to fetch workspaces for switcher', err);
      }
    }
    setIsSwitcherOpen(!isSwitcherOpen);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createNewNode(selectedType, newTitle.trim(), null);
    setNewTitle('');
    setIsCreateOpen(false);
  };

  return (
    <aside className="w-72 h-screen flex flex-col bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-md select-none shrink-0">
      {/* Workspace Header & Switcher */}
      <div className="p-4 border-b border-slate-800/60 relative">
        <div
          onClick={toggleSwitcher}
          className="flex items-center justify-between cursor-pointer group hover:bg-slate-900/60 p-1.5 -m-1.5 rounded-lg transition-colors"
          title="Switch workspace"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                {currentWorkspace ? currentWorkspace.name : 'Loading Workspace...'}
              </h2>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">{currentWorkspace?.slug || 'studio'}</span>
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform ${
              isSwitcherOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Switcher Dropdown */}
        {isSwitcherOpen && (
          <div className="absolute left-3 right-3 top-16 z-50 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl shadow-black/80 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              Switch Workspace
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/50">
              {availableWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.slug);
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', `/workspace/${ws.slug}`);
                    }
                    setIsSwitcherOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    currentWorkspace?.id === ws.id
                      ? 'bg-cyan-950/40 text-cyan-300 font-medium'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="text-[10px] text-slate-500 ml-2 shrink-0">{ws.slug}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Filter & New Document Action */}
      <div className="p-3 border-b border-slate-800/60 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search hierarchy..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>

        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-md text-xs font-medium shadow-md shadow-cyan-900/20 transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Document</span>
        </button>
      </div>

      {/* New Document Creator Panel */}
      {isCreateOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-3 bg-slate-900/90 border-b border-slate-800 text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
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

      {/* Tree Hierarchy Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar">
        {isLoading && rootNodeIds.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
            Loading hierarchy...
          </div>
        ) : rootNodeIds.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            No root nodes found. Create a screenplay, story, or article to begin.
          </div>
        ) : (
          rootNodeIds.map((rootId) => (
            <TreeNodeItem key={rootId} nodeId={rootId} level={0} />
          ))
        )}
      </div>
    </aside>
  );
};
