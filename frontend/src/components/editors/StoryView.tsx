'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Bookmark,
  Clock,
  BarChart3,
  AlignLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { WorkspaceNode } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface StoryViewProps {
  node: WorkspaceNode;
}

export const StoryView: React.FC<StoryViewProps> = ({ node }) => {
  const { nodes, childrenMap, loadNodeChildren } = useWorkspaceStore();

  const isChapter = node.type === 'chapter';

  const chapters: WorkspaceNode[] = useMemo(() => {
    if (isChapter) return [node];
    const childIds = childrenMap[node.id] || [];
    return childIds
      .map((cid) => nodes[cid])
      .filter((n): n is WorkspaceNode => n?.type === 'chapter');
  }, [isChapter, node, childrenMap, nodes]);

  const [userSelectedChapterId, setUserSelectedChapterId] = useState<string | null>(null);

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

        {/* Stats Pill */}
        <div className="flex items-center space-x-3 text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center space-x-1 text-violet-400 font-mono">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Target: {node.properties?.target_words?.toLocaleString() || '80,000'} words</span>
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

        {/* Prose Reading Canvas */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-16 bg-slate-950 flex justify-center">
          <div className="max-w-2xl w-full space-y-8">
            {/* Story Title & Chapter Banner */}
            <div className="text-center pb-8 border-b border-slate-800/60 space-y-2">
              <span className="text-xs font-mono tracking-widest text-violet-400 uppercase">
                {node.title}
              </span>
              <h2 className="text-3xl font-serif text-slate-100 font-semibold tracking-normal">
                {currentChapter?.title || 'Chapter 1'}
              </h2>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent mx-auto mt-4" />
            </div>

            {/* Paragraph Blocks */}
            <div className="space-y-6 text-slate-300 font-serif text-lg leading-relaxed antialiased">
              {paragraphs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 font-sans text-xs">
                  <AlignLeft className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  No paragraphs in this chapter yet. Add paragraph nodes to craft your story.
                </div>
              ) : (
                paragraphs.map((para, idx) => {
                  const isFirst = idx === 0;
                  const content = para.content || '';
                  const firstLetter = content.charAt(0);

                  return (
                    <div
                      key={para.id}
                      className="group relative p-3 -mx-3 rounded-lg hover:bg-slate-900/30 transition-colors"
                    >
                      {isFirst && firstLetter ? (
                        <p className="first-letter:float-left first-letter:text-5xl first-letter:pr-3 first-letter:font-serif first-letter:text-violet-400 first-letter:leading-none">
                          {content}
                        </p>
                      ) : (
                        <p>{content}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Chapter Footer / Progress */}
            {paragraphs.length > 0 && (
              <div className="pt-12 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-sans">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>End of Chapter</span>
                </span>
                <span>{paragraphs.length} paragraph blocks</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
