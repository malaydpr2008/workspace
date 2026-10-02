'use client';

import React from 'react';
import {
  Clapperboard,
  BookOpen,
  FileText,
  Folder,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ScreenplayView } from './editors/ScreenplayView';
import { StoryView } from './editors/StoryView';
import { ArticleView } from './editors/ArticleView';

export const NodeDispatcher: React.FC = () => {
  const {
    nodes,
    selectedNodeId,
    rootNodeIds,
    selectNode,
    childrenMap,
  } = useWorkspaceStore();

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center select-none">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/10">
            <Layers className="w-8 h-8 text-cyan-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Universal Workspace Canvas
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every document, screenplay, scene, chapter, and block is backed by the
              Universal Composite Node pattern in PostgreSQL.
            </p>
          </div>

          {rootNodeIds.length > 0 && (
            <div className="pt-4 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Quick Open
              </span>
              <div className="grid grid-cols-1 gap-2">
                {rootNodeIds.map((rid) => {
                  const rootNode = nodes[rid];
                  if (!rootNode) return null;

                  return (
                    <button
                      key={rid}
                      onClick={() => selectNode(rid)}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition-all text-left group"
                    >
                      <div className="flex items-center space-x-2.5">
                        {rootNode.type === 'screenplay' ? (
                          <Clapperboard className="w-4 h-4 text-cyan-400" />
                        ) : rootNode.type === 'story' ? (
                          <BookOpen className="w-4 h-4 text-violet-400" />
                        ) : rootNode.type === 'article' ? (
                          <FileText className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Folder className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                            {rootNode.title || 'Untitled'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">
                            {rootNode.type}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Polymorphic dispatch based on node type
  switch (selectedNode.type) {
    case 'screenplay':
    case 'scene':
      return <ScreenplayView node={selectedNode} />;

    case 'story':
    case 'chapter':
      return <StoryView node={selectedNode} />;

    case 'article':
      return <ArticleView node={selectedNode} />;

    case 'folder': {
      const childIds = childrenMap[selectedNode.id] || [];
      const childList = childIds
        .map((cid) => nodes[cid])
        .filter(Boolean);

      return (
        <div className="flex-1 p-8 bg-slate-950 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-3 pb-6 border-b border-slate-800">
              <Folder className="w-8 h-8 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedNode.title}</h1>
                <p className="text-xs text-slate-400">{childList.length} items in folder</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {childList.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectNode(c.id)}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-400">
                    {c.title || 'Untitled'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 uppercase">
                    {c.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="flex-1 p-8 bg-slate-950 overflow-y-auto text-slate-200">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white capitalize">{selectedNode.type} Node</h2>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs">
              <p className="text-slate-400 mb-2">Content:</p>
              <p className="text-slate-200 whitespace-pre-wrap">{selectedNode.content || '(Empty content)'}</p>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 overflow-x-auto">
              {JSON.stringify(selectedNode, null, 2)}
            </pre>
          </div>
        </div>
      );
  }
};
