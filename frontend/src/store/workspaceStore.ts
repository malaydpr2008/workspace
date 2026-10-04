import { create } from 'zustand';
import { WorkspaceState } from './types';
import { createNodesSlice, isDebounceActiveForNode } from './slices/nodesSlice';
import { createProductionSlice } from './slices/productionSlice';
import { createBudgetSlice } from './slices/budgetSlice';
import { createNotesSlice } from './slices/notesSlice';

export type { WorkspaceState };
export { isDebounceActiveForNode };

export const useWorkspaceStore = create<WorkspaceState>()((...a) => ({
  ...createNodesSlice(...a),
  ...createProductionSlice(...a),
  ...createBudgetSlice(...a),
  ...createNotesSlice(...a),
}));
