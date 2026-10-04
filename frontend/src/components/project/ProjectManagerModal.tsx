'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ProjectType } from '@/types/workspace';
import {
  Film,
  BookOpen,
  FileText,
  Plus,
  FolderOpen,
  Search,
  X,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentWorkspace,
    workspacesList,
    loadWorkspacesList,
    switchWorkspace,
    createNewProject,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<'recent' | 'create'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ProjectType>('film');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setActiveTab('recent');
    setErrorMsg(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      loadWorkspacesList();
    }
  }, [isOpen, loadWorkspacesList]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const filteredProjects = workspacesList.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectProject = async (slug: string) => {
    if (currentWorkspace?.slug === slug) {
      handleClose();
      return;
    }
    await switchWorkspace(slug);
    handleClose();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg('Please enter a project title');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await createNewProject(newTitle.trim(), newType, newDescription.trim());
      if (created) {
        setNewTitle('');
        setNewDescription('');
        handleClose();
      } else {
        setErrorMsg('Failed to create project. Check backend logs.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type?: ProjectType) => {
    switch (type) {
      case 'novel':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Novel Studio',
          style: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      case 'article':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-violet-400" />,
          label: 'Codex / Article',
          style: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
        };
      case 'film':
      default:
        return {
          icon: <Film className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Film Studio',
          style: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        };
    }
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Top Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Studio Project Manager</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Ctrl+P
                </span>
              </h2>
              <p className="text-xs text-slate-400">Switch between projects or launch a dedicated studio</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-800 px-6 bg-slate-900/60 shrink-0 gap-4">
          <button
            onClick={() => setActiveTab('recent')}
            className={`py-3 text-xs font-mono font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'recent'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Projects ({workspacesList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 text-xs font-mono font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'create'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Studio</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'recent' && (
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter projects by title, slug, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
                />
              </div>

              {/* Projects List */}
              <div className="space-y-2.5">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No matching projects found.
                  </div>
                ) : (
                  filteredProjects.map((project) => {
                    const badge = getTypeBadge(project.project_type);
                    const isCurrent = currentWorkspace?.id === project.id;

                    return (
                      <div
                        key={project.id}
                        onClick={() => handleSelectProject(project.slug)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? 'bg-cyan-950/20 border-cyan-500/50 shadow-sm shadow-cyan-950/40 ring-1 ring-cyan-500/20'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5 min-w-0">
                          <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${badge.style}`}>
                            {badge.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                                {project.name}
                              </h3>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badge.style}`}>
                                {badge.label}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              {project.description || `Slug: ${project.slug}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0 ml-4">
                          <span className="text-xs font-mono font-medium hidden sm:inline">
                            {isCurrent ? 'Current' : 'Launch'}
                          </span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateProject} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Neon Horizon, The Glass Citadel"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Studio Domain Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300">Studio Discipline / Domain</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Film Studio */}
                  <div
                    onClick={() => setNewType('film')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      newType === 'film'
                        ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/40 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <Film className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">Film Studio</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Screenplay, scene spine, storyboard shots, stripboard scheduling & budgets.
                    </p>
                  </div>

                  {/* Novel Studio */}
                  <div
                    onClick={() => setNewType('novel')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      newType === 'novel'
                        ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Novel Studio</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Prose manuscript, acts, chapters, paragraphs, and character sidebars.
                    </p>
                  </div>

                  {/* Article Codex */}
                  <div
                    onClick={() => setNewType('article')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      newType === 'article'
                        ? 'bg-violet-950/40 border-violet-500/80 ring-1 ring-violet-500/40 text-violet-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <FileText className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-bold text-white">Article Codex</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Technical documentation, worldbuilding bible, and research notes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">Logline / Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short logline, synopsis, or thesis..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('recent')}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-semibold shadow-lg shadow-cyan-950/50 flex items-center space-x-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Scaffolding Studio...' : 'Initialize Studio'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
