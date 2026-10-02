'use client';

import React from 'react';
import {
  FileText,
  Clock,
  Tag,
  Calendar,
  Share2,
  Bookmark,
  Layers,
  Sparkles,
} from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ArticleViewProps {
  node: WorkspaceNode;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ node }) => {
  const { nodes, childrenMap } = useWorkspaceStore();

  const childIds = childrenMap[node.id] || [];
  const childBlocks = childIds
    .map((cid) => nodes[cid])
    .filter((n): n is WorkspaceNode => Boolean(n));

  const tags: string[] = node.properties?.tags || ['Engineering', 'Architecture'];
  const readingTime = node.properties?.reading_time_minutes || 5;
  const createdDate = new Date(node.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Top Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white truncate max-w-md">
                {node.title || 'Untitled Article'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                EDITORIAL
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{readingTime} min read</span>
          </span>
          <button className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Editorial Canvas */}
      <div className="flex-1 p-8 lg:p-16 flex justify-center">
        <article className="max-w-3xl w-full space-y-10">
          {/* Article Header & Metadata */}
          <header className="space-y-5 pb-8 border-b border-slate-800/80">
            {/* Tags Bar */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                >
                  <Tag className="w-3 h-3 text-emerald-400" />
                  <span>{t}</span>
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {node.title || 'Universal Composite Node Architectures'}
            </h1>

            {/* Publishing Metadata Card */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/20">
                  A
                </div>
                <div>
                  <div className="text-slate-200 font-medium">Antigravity Architecture Team</div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{createdDate}</span>
                    </span>
                    <span>•</span>
                    <span>Deterministic Rank: {node.rank}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Single Table Invariant</span>
              </div>
            </div>
          </header>

          {/* Lead Abstract / Content */}
          {node.content && (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-xl">
              <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Abstract & Overview</span>
              </div>
              <p className="text-lg text-slate-200 font-light leading-relaxed">
                {node.content}
              </p>
            </div>
          )}

          {/* Child Paragraphs / Blocks if any */}
          {childBlocks.length > 0 && (
            <div className="space-y-6 pt-4">
              {childBlocks.map((block) => (
                <div key={block.id} className="space-y-2">
                  {block.title && (
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {block.title}
                    </h3>
                  )}
                  {block.content && (
                    <p className="text-base text-slate-300 leading-relaxed font-normal">
                      {block.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Single Table Universal Pattern Info Card */}
          <div className="p-6 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-xs text-slate-400 space-y-2 font-mono">
            <div className="text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Node Properties Payload (JSONB)</span>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg text-slate-400 text-[11px] overflow-x-auto border border-slate-800/80">
              {JSON.stringify(node.properties, null, 2)}
            </pre>
          </div>
        </article>
      </div>
    </div>
  );
};
