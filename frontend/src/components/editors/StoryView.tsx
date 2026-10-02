'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Bookmark,
  Clock,
  BarChart3,
  AlignLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface StoryViewProps {
  node: WorkspaceNode;
}

export const StoryView: React.FC<StoryViewProps> = ({ node }) => {
  const {
    nodes,
    childrenMap,
    loadNodeChildren,
    updateNodeContent,
    updateNodeTitle,
    insertBlock,
    deleteNode,
    saveStatus,
  } = useWorkspaceStore();

  const isChapter = node.type === 'chapter';

  const chapters: WorkspaceNode[] = useMemo(() => {
    if (isChapter) return [node];
    const childIds = childrenMap[node.id] || [];
    return childIds
      .map((cid) => nodes[cid])
      .filter((n): n is WorkspaceNode => n?.type === 'chapter');
  }, [isChapter, node, childrenMap, nodes]);

  const [userSelectedChapterId, setUserSelectedChapterId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const activeChapterId = isChapter
    ? node.id
    : (userSelectedChapterId && chapters.some((c) => c.id === userSelectedChapterId)
        ? userSelectedChapterId
        : chapters[0]?.id) || '';

  useEffect(() => {
    if (activeChapterId && !childrenMap[activeChapterId]) {
      loadNodeChildren(activeChapterId);
    }
  }, [activeChapterId, loadNodeChildren, childrenMap]);

  const currentChapter = nodes[activeChapterId] || (isChapter ? node : null);
  const paragraphs = currentChapter
    ? (childrenMap[currentChapter.id] || [])
        .map((cid) => nodes[cid])
        .filter((n): n is WorkspaceNode => Boolean(n))
    : [];

  // Compute word count and reading time across paragraphs
  const allText = paragraphs.map((p) => p.content || '').join(' ');
  const wordCount = allText.trim() ? allText.trim().split(/\s+/).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  const focusParagraph = (paraId: string) => {
    setTimeout(() => {
      inputRefs.current[paraId]?.focus();
    }, 50);
  };

  const handleAddParagraph = async (afterId: string | null = null) => {
    if (!currentChapter) return;
    const newPara = await insertBlock(currentChapter.id, 'paragraph', afterId, '');
    if (newPara) {
      focusParagraph(newPara.id);
    }
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    para: WorkspaceNode,
    idx: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleAddParagraph(para.id);
    } else if (e.key === 'Backspace' && !para.content) {
      e.preventDefault();
      const prev = paragraphs[idx - 1];
      await deleteNode(para.id);
      if (prev) focusParagraph(prev.id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Meta Header */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                {node.title || 'Untitled Story'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                PROSE NOVEL
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{chapters.length} Chapter{chapters.length === 1 ? '' : 's'}</span>
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

        {/* Stats & Save Status */}
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

          <div className="flex items-center space-x-3 text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-1 text-violet-400 font-mono">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Target: {node.properties?.target_words?.toLocaleString() || '80,000'} words</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reader View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chapter Outline Sidebar */}
        <div className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 space-y-1.5 shrink-0 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
            <span>Table of Contents</span>
            <Bookmark className="w-3.5 h-3.5 text-violet-400" />
          </div>

          {chapters.length === 0 ? (
            <div className="px-2 text-xs text-slate-500">No chapters yet.</div>
          ) : (
            chapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => setUserSelectedChapterId(ch.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeChapterId === ch.id
                    ? 'bg-violet-600/20 text-violet-200 border border-violet-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-mono text-slate-500">{idx + 1}.</span>
                  <span className="truncate">{ch.title || `Chapter ${idx + 1}`}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0 ml-1" />
              </button>
            ))
          )}
        </div>

        {/* Prose Reading & Editing Canvas */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-16 bg-slate-950 flex justify-center">
          <div className="max-w-2xl w-full space-y-8">
            {/* Story Title & Chapter Banner */}
            <div className="text-center pb-8 border-b border-slate-800/60 space-y-2">
              <span className="text-xs font-mono tracking-widest text-violet-400 uppercase">
                {node.title}
              </span>
              {currentChapter ? (
                <input
                  type="text"
                  value={currentChapter.title}
                  onChange={(e) => updateNodeTitle(currentChapter.id, e.target.value)}
                  placeholder="Chapter Title..."
                  className="w-full text-center text-3xl font-serif text-slate-100 font-semibold tracking-normal bg-transparent focus:outline-none border-b border-transparent focus:border-violet-500/40 pb-1"
                />
              ) : (
                <h2 className="text-3xl font-serif text-slate-100 font-semibold">Chapter 1</h2>
              )}
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent mx-auto mt-4" />
            </div>

            {/* Paragraph Blocks */}
            <div className="space-y-6 text-slate-300 font-serif text-lg leading-relaxed antialiased">
              {paragraphs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 font-sans text-xs space-y-3">
                  <AlignLeft className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <p>No paragraphs in this chapter yet.</p>
                  <button
                    onClick={() => handleAddParagraph(null)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-sans font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Paragraph</span>
                  </button>
                </div>
              ) : (
                paragraphs.map((para, idx) => (
                  <div key={para.id} className="group relative -mx-4 p-4 rounded-xl hover:bg-slate-900/40 transition-all">
                    {/* Delete and quick action buttons */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 font-sans">
                      <button
                        onClick={() => handleAddParagraph(para.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Insert paragraph below"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteNode(para.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-500"
                        title="Delete paragraph"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      ref={(el) => {
                        inputRefs.current[para.id] = el;
                      }}
                      value={para.content}
                      onChange={(e) => updateNodeContent(para.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, para, idx)}
                      placeholder="Write your story prose here..."
                      rows={Math.max(2, para.content.split('\n').length)}
                      className="w-full bg-transparent resize-none font-serif text-lg leading-relaxed text-slate-200 focus:outline-none placeholder-slate-600"
                    />

                    {/* Quick "+" insertion line between paragraphs on hover */}
                    <div className="relative h-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800" />
                      </div>
                      <div className="relative flex justify-center">
                        <button
                          onClick={() => handleAddParagraph(para.id)}
                          className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-sans text-slate-400 hover:text-violet-300 hover:border-violet-500 flex items-center space-x-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Insert Paragraph</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chapter Footer / Progress */}
            {paragraphs.length > 0 && (
              <div className="pt-8 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-sans">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>End of Chapter</span>
                </span>
                <button
                  onClick={() => handleAddParagraph(paragraphs[paragraphs.length - 1]?.id)}
                  className="flex items-center space-x-1 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-violet-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Paragraph</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
