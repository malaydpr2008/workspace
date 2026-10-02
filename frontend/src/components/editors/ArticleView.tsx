'use client';

import React from 'react';
import {
  FileText,
  Clock,
  Tag,
  Calendar,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  compileArticleToMarkdown,
  downloadFile,
  copyToClipboard,
} from '@/lib/compiler';
import { DocumentExportButton } from '@/components/export/DocumentExportButton';

interface ArticleViewProps {
  node: WorkspaceNode;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ node }) => {
  const {
    nodes,
    childrenMap,
    updateNodeContent,
    updateNodeTitle,
    insertBlock,
    deleteNode,
    saveStatus,
  } = useWorkspaceStore();

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

  const handleAddSection = async (type: 'heading' | 'paragraph') => {
    await insertBlock(
      node.id,
      type,
      childBlocks[childBlocks.length - 1]?.id || null,
      ''
    );
  };

  // Export handlers
  const handleExportMarkdown = () => {
    const md = compileArticleToMarkdown(node, nodes, childrenMap);
    const slug = (node.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(md, `${slug}.md`, 'text/markdown;charset=utf-8');
  };

  const handleExportText = () => {
    const md = compileArticleToMarkdown(node, nodes, childrenMap);
    const slug = (node.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadFile(md, `${slug}.txt`, 'text/plain;charset=utf-8');
  };

  const handleCopyClipboard = async () => {
    const md = compileArticleToMarkdown(node, nodes, childrenMap);
    return await copyToClipboard(md);
  };

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

        {/* Live Auto-save indicator, Stats & Export */}
        <div className="flex items-center space-x-4">
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

          <span className="flex items-center space-x-1 font-mono text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{readingTime} min read</span>
          </span>

          {/* Document Compilation Export Dropdown */}
          <DocumentExportButton
            onExportPrimary={handleExportMarkdown}
            primaryLabel="Export as Markdown"
            primaryExtension=".md"
            onExportPlainText={handleExportText}
            onCopyClipboard={handleCopyClipboard}
          />
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

            {/* Editable Title */}
            <input
              type="text"
              value={node.title}
              onChange={(e) => updateNodeTitle(node.id, e.target.value)}
              placeholder="Article Title..."
              className="w-full text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight bg-transparent focus:outline-none border-b border-transparent focus:border-emerald-500/40 pb-2"
            />

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

          {/* Lead Abstract / Content (Editable) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Abstract & Overview</span>
              </div>
            </div>
            <textarea
              value={node.content}
              onChange={(e) => updateNodeContent(node.id, e.target.value)}
              placeholder="Write the executive abstract or editorial introduction..."
              rows={Math.max(3, node.content.split('\n').length)}
              className="w-full bg-transparent resize-none text-lg text-slate-200 font-light leading-relaxed focus:outline-none placeholder-slate-600"
            />
          </div>

          {/* Child Paragraphs / Blocks if any */}
          <div className="space-y-6 pt-2">
            {childBlocks.map((block) => (
              <div
                key={block.id}
                className="group relative -mx-4 p-4 rounded-xl hover:bg-slate-900/40 transition-all space-y-2"
              >
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                  <button
                    onClick={() => deleteNode(block.id)}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-500"
                    title="Delete section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {block.type === 'heading' ? (
                  <input
                    type="text"
                    value={block.title || block.content}
                    onChange={(e) => updateNodeTitle(block.id, e.target.value)}
                    placeholder="Section Heading..."
                    className="w-full text-xl font-bold text-white tracking-tight bg-transparent focus:outline-none"
                  />
                ) : (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateNodeContent(block.id, e.target.value)}
                    placeholder="Article body paragraph..."
                    rows={Math.max(2, block.content.split('\n').length)}
                    className="w-full bg-transparent resize-none text-base text-slate-300 leading-relaxed font-normal focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Add Section Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-800/60">
            <button
              onClick={() => handleAddSection('paragraph')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paragraph</span>
            </button>
            <button
              onClick={() => handleAddSection('heading')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subheading</span>
            </button>
          </div>

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
