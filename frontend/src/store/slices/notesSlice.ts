import { StateCreator } from 'zustand';
import { ScriptNote } from '@/types/workspace';
import {
  fetchScriptNotes,
  createScriptNote,
  toggleResolveNote,
  deleteScriptNote,
  fetchActivityLogs,
  createActivityLog,
} from '@/lib/api';
import { WorkspaceState, NotesSlice } from '../types';

export const createNotesSlice: StateCreator<
  WorkspaceState,
  [],
  [],
  NotesSlice
> = (set) => ({
  notesByNode: {},
  activityLogs: [],

  loadNotesForNode: async (nodeId: string) => {
    try {
      const list = await fetchScriptNotes(nodeId);
      set((state) => ({
        notesByNode: {
          ...state.notesByNode,
          [nodeId]: list,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load notes for node', nodeId, err);
      return [];
    }
  },

  loadNotesForWorkspace: async (workspaceId: string) => {
    try {
      const list = await fetchScriptNotes(undefined, workspaceId);
      const grouped: Record<string, ScriptNote[]> = {};
      list.forEach((n) => {
        const nid = n.node;
        if (!grouped[nid]) grouped[nid] = [];
        grouped[nid].push(n);
      });
      set((state) => ({
        notesByNode: {
          ...state.notesByNode,
          ...grouped,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load notes for workspace', workspaceId, err);
      return [];
    }
  },

  createScriptNoteItem: async (data) => {
    try {
      const created = await createScriptNote(data);
      const nodeId = data.node;
      set((state) => {
        const current = state.notesByNode[nodeId] || [];
        if (data.parent_note) {
          return {
            notesByNode: {
              ...state.notesByNode,
              [nodeId]: current.map((n) =>
                n.id === data.parent_note
                  ? { ...n, replies: [...(n.replies || []), created] }
                  : n
              ),
            },
          };
        }
        return {
          notesByNode: {
            ...state.notesByNode,
            [nodeId]: [...current, created],
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create script note', err);
      return null;
    }
  },

  toggleResolveScriptNoteItem: async (noteId: string, nodeId: string) => {
    try {
      const updated = await toggleResolveNote(noteId);
      set((state) => {
        const current = state.notesByNode[nodeId] || [];
        return {
          notesByNode: {
            ...state.notesByNode,
            [nodeId]: current.map((n) =>
              n.id === noteId ? { ...n, is_resolved: updated.is_resolved } : n
            ),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to toggle resolve script note', err);
      return null;
    }
  },

  deleteScriptNoteItem: async (noteId: string, nodeId: string) => {
    try {
      await deleteScriptNote(noteId);
      set((state) => {
        const current = state.notesByNode[nodeId] || [];
        return {
          notesByNode: {
            ...state.notesByNode,
            [nodeId]: current.filter((n) => n.id !== noteId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete script note', err);
    }
  },

  loadActivityLogs: async (workspaceId, department, actionType) => {
    try {
      const logs = await fetchActivityLogs(workspaceId, department, actionType);
      set({ activityLogs: logs });
      return logs;
    } catch (err) {
      console.error('Failed to load activity logs', err);
      return [];
    }
  },

  logStudioAction: async (actionData) => {
    try {
      const created = await createActivityLog(actionData);
      set((state) => ({
        activityLogs: [created, ...state.activityLogs],
      }));
      return created;
    } catch (err) {
      console.error('Failed to create activity log', err);
      return null;
    }
  },
});
