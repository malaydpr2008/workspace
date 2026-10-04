import { StateCreator } from 'zustand';
import {
  ProductionBudget,
  BudgetCategory,
  BudgetLineItem,
} from '@/types/workspace';
import {
  fetchBudgets,
  fetchBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  populateBudgetFromWorkspace,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  createBudgetLineItem,
  updateBudgetLineItem,
  deleteBudgetLineItem,
} from '@/lib/api';
import { WorkspaceState, BudgetSlice } from '../types';

export const createBudgetSlice: StateCreator<
  WorkspaceState,
  [],
  [],
  BudgetSlice
> = (set) => ({
  budgets: [],
  activeBudgetId: null,

  loadBudgets: async (screenplayId: string, workspaceId?: string) => {
    try {
      const budgets = await fetchBudgets(screenplayId, workspaceId);
      set({
        budgets,
        activeBudgetId: budgets[0]?.id || null,
      });
      return budgets;
    } catch (err) {
      console.error('Failed to load budgets', err);
      return [];
    }
  },

  setActiveBudget: (budgetId: string | null) => {
    set({ activeBudgetId: budgetId });
  },

  createBudgetItem: async (data: Partial<ProductionBudget>) => {
    try {
      const created = await createBudget(data);
      set((state) => ({
        budgets: [created, ...state.budgets],
        activeBudgetId: created.id,
      }));
      return created;
    } catch (err) {
      console.error('Failed to create budget', err);
      return null;
    }
  },

  updateBudgetItem: async (id: string, data: Partial<ProductionBudget>) => {
    try {
      const updated = await updateBudget(id, data);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? updated : b)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update budget', err);
      return null;
    }
  },

  deleteBudgetItem: async (id: string) => {
    try {
      await deleteBudget(id);
      set((state) => {
        const remaining = state.budgets.filter((b) => b.id !== id);
        return {
          budgets: remaining,
          activeBudgetId: state.activeBudgetId === id ? remaining[0]?.id || null : state.activeBudgetId,
        };
      });
    } catch (err) {
      console.error('Failed to delete budget', err);
    }
  },

  autoPopulateBudget: async (budgetId: string) => {
    try {
      const populated = await populateBudgetFromWorkspace(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? populated : b)),
      }));
      return populated;
    } catch (err) {
      console.error('Failed to auto-populate budget', err);
      return null;
    }
  },

  createBudgetCategoryItem: async (data: Partial<BudgetCategory>, budgetId: string) => {
    try {
      const created = await createBudgetCategory(data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create budget category', err);
      return null;
    }
  },

  updateBudgetCategoryItem: async (id: string, data: Partial<BudgetCategory>, budgetId: string) => {
    try {
      const updated = await updateBudgetCategory(id, data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update budget category', err);
      return null;
    }
  },

  deleteBudgetCategoryItem: async (id: string, budgetId: string) => {
    try {
      await deleteBudgetCategory(id);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
    } catch (err) {
      console.error('Failed to delete budget category', err);
    }
  },

  createBudgetLineItemItem: async (data: Partial<BudgetLineItem>, budgetId: string) => {
    try {
      const created = await createBudgetLineItem(data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create budget line item', err);
      return null;
    }
  },

  updateBudgetLineItemItem: async (id: string, data: Partial<BudgetLineItem>, budgetId: string) => {
    try {
      const updated = await updateBudgetLineItem(id, data);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update budget line item', err);
      return null;
    }
  },

  deleteBudgetLineItemItem: async (id: string, budgetId: string) => {
    try {
      await deleteBudgetLineItem(id);
      const fresh = await fetchBudget(budgetId);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? fresh : b)),
      }));
    } catch (err) {
      console.error('Failed to delete budget line item', err);
    }
  },
});
