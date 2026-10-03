'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  CornerDownRight,
  X,
  Send,
  Trash2,
} from 'lucide-react';
import {
  ScriptNote,
  WorkspaceNode,
  NoteCategory,
  AuthorRole,
  WorkspaceRole,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ScriptNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeNode: WorkspaceNode | null;
  allSceneNodes: WorkspaceNode[];
  onSelectNode: (nodeId: string) => void;
}

export const CATEGORY_CONFIG: Record<
  NoteCategory,
  { label: string; bg: string; text: string; border: string; badge: string }
> = {
  CREATIVE: {
    label: 'Creative',
    bg: 'bg-violet-950/40',
    text: 'text-violet-300',
    border: 'border-violet-500/40',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  LEGAL: {
    label: 'Legal',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  CONTINUITY: {
    label: 'Continuity',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  PRODUCTION: {
    label: 'Production',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  DIRECTOR: {
    label: 'Director',
    bg: 'bg-sky-950/40',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
};

const AUTHOR_ROLES: AuthorRole[] = [
  'DIRECTOR',
  'PRODUCER',
  'WRITER',
  'LEGAL',
  'SCRIPT_SUPERVISOR',
];

export const ScriptNotesDrawer: React.FC<ScriptNotesDrawerProps> = ({
  isOpen,
  onClose,
  activeNode,
  allSceneNodes,
  onSelectNode,
}) => {
  const {
    notesByNode,
    loadNotesForNode,
    createScriptNoteItem,
    toggleResolveScriptNoteItem,
    deleteScriptNoteItem,
    currentWorkspace,
    currentUserRole,
    logStudioAction,
  } = useWorkspaceStore();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [onlyUnresolved, setOnlyUnresolved] = useState<boolean>(false);

  // New Note Form State
  const [newAuthorName, setNewAuthorName] = useState('Director');
  const [newAuthorRole, setNewAuthorRole] = useState<AuthorRole>('DIRECTOR');
  const [newCategory, setNewCategory] = useState<NoteCategory>('CREATIVE');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state
  const [replyingToNoteId, setReplyingToNoteId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const activeNodeId = activeNode?.id;

  // Load notes for active node
  useEffect(() => {
    if (isOpen && activeNodeId) {
      loadNotesForNode(activeNodeId);
    }
  }, [isOpen, activeNodeId, loadNotesForNode]);

  const rawNotes: ScriptNote[] = useMemo(() => {
    if (!activeNodeId) return [];
    return notesByNode[activeNodeId] || [];
  }, [activeNodeId, notesByNode]);

  // Filter root notes
  const rootNotes = useMemo(() => {
    return rawNotes.filter((n) => !n.parent_note);
  }, [rawNotes]);

  const filteredNotes = useMemo(() => {
    return rootNotes.filter((note) => {
      if (onlyUnresolved && note.is_resolved) return false;
      if (
        selectedCategoryFilter !== 'ALL' &&
        note.category !== selectedCategoryFilter
      ) {
        return false;
      }
      return true;
    });
  }, [rootNotes, onlyUnresolved, selectedCategoryFilter]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode || !newNoteText.trim()) return;

    setIsSubmitting(true);
    try {
      await createScriptNoteItem({
        node: activeNode.id,
        author_name: newAuthorName.trim() || 'Reviewer',
        author_role: newAuthorRole,
        category: newCategory,
        text: newNoteText.trim(),
      });

      if (currentWorkspace?.id) {
        logStudioAction({
          workspace: currentWorkspace.id,
          actor_name: newAuthorName.trim() || 'Reviewer',
          actor_role: (newAuthorRole as unknown as WorkspaceRole) || currentUserRole,
          action_type: 'NOTE_ADDED',
          department: newCategory === 'LEGAL' ? 'LEGAL' : newCategory === 'PRODUCTION' ? 'PRODUCTION' : 'SCRIPT',
          description: `Added ${newCategory} note on ${activeNode.title || 'Scene'}: "${newNoteText.trim().slice(0, 45)}..."`,
          target_node: activeNode.id,
        });
      }

      setNewNoteText('');
    } catch (err) {
      console.error('Failed to create script note', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (parentNoteId: string) => {
    if (!activeNode || !replyText.trim()) return;

    try {
      await createScriptNoteItem({
        node: activeNode.id,
        parent_note: parentNoteId,
        author_name: newAuthorName.trim() || 'Reviewer',
        author_role: newAuthorRole,
        category: newCategory,
        text: replyText.trim(),
      });
      setReplyText('');
      setReplyingToNoteId(null);
    } catch (err) {
      console.error('Failed to create reply', err);
    }
  };

  const handleToggleResolve = async (noteId: string) => {
    if (!activeNode) return;
    const targetNote = rawNotes.find((n) => n.id === noteId);
    const willBeResolved = targetNote ? !targetNote.is_resolved : true;
    await toggleResolveScriptNoteItem(noteId, activeNode.id);

    if (currentWorkspace?.id && targetNote) {
      logStudioAction({
        workspace: currentWorkspace.id,
        actor_name: currentUserRole === 'OWNER' ? 'Studio Supervisor' : `${currentUserRole} Lead`,
        actor_role: currentUserRole,
        action_type: willBeResolved ? 'NOTE_RESOLVED' : 'NOTE_ADDED',
        department: targetNote.category === 'LEGAL' ? 'LEGAL' : 'SCRIPT',
        description: `${willBeResolved ? 'Resolved' : 'Reopened'} ${targetNote.category} note: "${targetNote.text.slice(0, 40)}..."`,
        target_node: activeNode.id,
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeNode) return;
    await deleteScriptNoteItem(noteId, activeNode.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Script Marginalia & Review
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {rawNotes.length} Notes
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
              {activeNode ? (
                <span>
                  Anchored to:{' '}
                  <strong className="text-cyan-300 font-mono">
                    {activeNode.type.toUpperCase()}{' '}
                    {activeNode.title || activeNode.content?.slice(0, 30)}
                  </strong>
                </span>
              ) : (
                'Select a script block to view anchored comments'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Target Anchor Selector Dropdown */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono shrink-0">
        <span className="text-slate-400 text-[10px] uppercase">Anchor Target:</span>
        <select
          value={activeNode?.id || ''}
          onChange={(e) => onSelectNode(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs max-w-[300px] truncate focus:outline-none focus:border-violet-500"
        >
          {allSceneNodes.map((n) => (
            <option key={n.id} value={n.id}>
              [{n.type.toUpperCase()}] {n.title || n.content?.slice(0, 45) || 'Block'}
            </option>
          ))}
        </select>
      </div>

      {/* Category & Status Filter Pills */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs font-mono">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-2 py-0.5 rounded text-[10px] uppercase transition-colors ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-violet-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_CONFIG) as NoteCategory[]).map((cat) => {
            const isSelected = selectedCategoryFilter === cat;
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase transition-colors border ${
                  isSelected
                    ? `${cfg.badge} font-bold`
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border-slate-800'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setOnlyUnresolved(!onlyUnresolved)}
          className={`px-2 py-0.5 rounded text-[10px] uppercase shrink-0 transition-colors border ${
            onlyUnresolved
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
          }`}
        >
          {onlyUnresolved ? 'Unresolved' : 'All States'}
        </button>
      </div>

      {/* Notes Stream Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {filteredNotes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-slate-400 font-semibold text-xs">
              No notes anchored to this script block yet.
            </p>
            <p className="text-[11px] text-slate-600">
              Leave feedback below for the writer, legal clearance, or continuity supervisor.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const catConfig = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.CREATIVE;
            const replies = note.replies || [];

            return (
              <div
                key={note.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  note.is_resolved
                    ? 'bg-slate-950/60 border-slate-800/80 opacity-60'
                    : `${catConfig.bg} ${catConfig.border}`
                }`}
              >
                {/* Note Author & Tag Row */}
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${catConfig.badge}`}
                    >
                      {catConfig.label}
                    </span>
                    <span className="font-bold text-white text-xs">
                      {note.author_name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      ({note.author_role})
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleToggleResolve(note.id)}
                      className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        note.is_resolved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={note.is_resolved ? 'Re-open note' : 'Mark as resolved'}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{note.is_resolved ? 'Resolved' : 'Resolve'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Note Content */}
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                  {note.text}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>
                    {new Date(note.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>

                  <button
                    onClick={() => {
                      setReplyingToNoteId(
                        replyingToNoteId === note.id ? null : note.id
                      );
                      setReplyText('');
                    }}
                    className="text-violet-400 hover:text-violet-300 font-bold flex items-center space-x-1"
                  >
                    <CornerDownRight className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                </div>

                {/* Threaded Replies */}
                {replies.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-white/10 space-y-2 pt-1">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-200">
                            {reply.author_name}{' '}
                            <span className="text-slate-500 font-normal">
                              ({reply.author_role})
                            </span>
                          </span>
                          <span className="text-slate-500">
                            {new Date(reply.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                          {reply.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input Form */}
                {replyingToNoteId === note.id && (
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center space-x-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(note.id);
                        }
                      }}
                      placeholder={`Reply as ${newAuthorName}...`}
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-violet-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSendReply(note.id)}
                      disabled={!replyText.trim()}
                      className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Note Form Bottom Panel */}
      <form
        onSubmit={handleCreateNote}
        className="p-4 border-t border-slate-800 bg-slate-900/95 space-y-3 shrink-0 font-mono text-xs"
      >
        <div className="flex items-center space-x-2">
          {/* Author Name */}
          <input
            type="text"
            value={newAuthorName}
            onChange={(e) => setNewAuthorName(e.target.value)}
            placeholder="Your Name / Title"
            className="flex-1 bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-violet-500"
          />

          {/* Role */}
          <select
            value={newAuthorRole}
            onChange={(e) => setNewAuthorRole(e.target.value as AuthorRole)}
            className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-violet-500"
          >
            {AUTHOR_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Category */}
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
            className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-violet-500"
          >
            {(Object.keys(CATEGORY_CONFIG) as NoteCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleCreateNote(e);
              }
            }}
            placeholder="Write anchored feedback or review note... (Ctrl+Enter to post)"
            rows={2}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-violet-500 resize-none placeholder-slate-600"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Press Ctrl+Enter to post note
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !newNoteText.trim() || !activeNode}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-xs disabled:opacity-40 transition-colors shadow-md shadow-violet-950/40"
          >
            <Send className="w-3 h-3" />
            <span>Post Note</span>
          </button>
        </div>
      </form>
    </div>
  );
};
