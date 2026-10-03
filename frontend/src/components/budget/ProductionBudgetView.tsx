'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Download,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FolderPlus,
} from 'lucide-react';
import {
  WorkspaceNode,
  BudgetCategory,
  BudgetTier,
  RateType,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { downloadFile } from '@/lib/compiler';

interface ProductionBudgetViewProps {
  screenplayNode: WorkspaceNode;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
};

export const TIER_CONFIG: Record<
  BudgetTier,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  ATL: {
    label: 'Above-The-Line (ATL)',
    icon: '🎭',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  BTL_PRODUCTION: {
    label: 'Below-The-Line Production (BTL)',
    icon: '🎬',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  BTL_POST: {
    label: 'Below-The-Line Post-Production (BTL)',
    icon: '🎧',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
  },
  OTHER: {
    label: 'Other & General / Administrative',
    icon: '📊',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
};

export const RATE_TYPES: { value: RateType; label: string }[] = [
  { value: 'FLAT', label: 'Flat' },
  { value: 'DAILY', label: 'Day' },
  { value: 'WEEKLY', label: 'Week' },
  { value: 'HOURLY', label: 'Hour' },
  { value: 'PER_UNIT', label: 'Unit' },
];

export const formatMoney = (amount: number | string | undefined | null, currency: string = 'USD'): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0;
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const ProductionBudgetView: React.FC<ProductionBudgetViewProps> = ({ screenplayNode }) => {
  const {
    currentWorkspace,
    budgets,
    activeBudgetId,
    loadBudgets,
    setActiveBudget,
    createBudgetItem,
    autoPopulateBudget,
    createBudgetCategoryItem,
    deleteBudgetCategoryItem,
    createBudgetLineItemItem,
    updateBudgetLineItemItem,
    deleteBudgetLineItemItem,
    currentUserRole,
    logStudioAction,
  } = useWorkspaceStore();

  const [isPopulating, setIsPopulating] = useState(false);
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [selectedCategoryForNewItem, setSelectedCategoryForNewItem] = useState<string | null>(null);

  // New Budget form state
  const [newBudgetTitle, setNewBudgetTitle] = useState('Production Budget - Master Draft');
  const [newBudgetCurrency, setNewBudgetCurrency] = useState('USD');
  const [newBudgetContingency, setNewBudgetContingency] = useState('10.0');

  // New Category form state
  const [newCatCode, setNewCatCode] = useState('7000');
  const [newCatName, setNewCatName] = useState('');
  const [newCatTier, setNewCatTier] = useState<BudgetTier>('BTL_PRODUCTION');

  // New Line Item form state
  const [newItemAccount, setNewItemAccount] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemRateType, setNewItemRateType] = useState<RateType>('DAILY');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('1500');
  const [newItemFringe, setNewItemFringe] = useState('15');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Expand/collapse category state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Active budget object
  const activeBudget = useMemo(() => {
    if (!budgets.length) return null;
    return budgets.find((b) => b.id === activeBudgetId) || budgets[0] || null;
  }, [budgets, activeBudgetId]);

  // Load budgets on mount or screenplay change
  useEffect(() => {
    if (screenplayNode?.id) {
      loadBudgets(screenplayNode.id, currentWorkspace?.id);
    }
  }, [screenplayNode?.id, currentWorkspace?.id, loadBudgets]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleCreateBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !screenplayNode?.id) return;
    const created = await createBudgetItem({
      workspace: currentWorkspace.id,
      screenplay: screenplayNode.id,
      title: newBudgetTitle.trim() || 'Production Budget',
      currency: newBudgetCurrency,
      contingency_percentage: parseFloat(newBudgetContingency) || 10.0,
    });
    if (created) {
      setIsNewBudgetModalOpen(false);
      setNewBudgetTitle('Production Budget - Master Draft');
    }
  };

  const handleAutoPopulate = async () => {
    if (!activeBudget) return;
    setIsPopulating(true);
    try {
      await autoPopulateBudget(activeBudget.id);
      if (currentWorkspace?.id) {
        logStudioAction({
          workspace: currentWorkspace.id,
          actor_name: currentUserRole === 'OWNER' ? 'Studio Producer' : `${currentUserRole} Lead`,
          actor_role: currentUserRole,
          action_type: 'BUDGET_UPDATE',
          department: 'BUDGET',
          description: `Auto-populated budget line items from Cast DOOD, Stripboard shoot schedule, and Breakdown elements`,
        });
      }
    } finally {
      setIsPopulating(false);
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudget || !newCatName.trim()) return;
    await createBudgetCategoryItem(
      {
        budget: activeBudget.id,
        code: newCatCode.trim() || '7000',
        name: newCatName.trim().toUpperCase(),
        tier: newCatTier,
        order: 99,
      },
      activeBudget.id
    );
    setIsNewCategoryModalOpen(false);
    setNewCatName('');
  };

  const handleCreateLineItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudget || !selectedCategoryForNewItem || !newItemDesc.trim()) return;
    await createBudgetLineItemItem(
      {
        category: selectedCategoryForNewItem,
        account_code: newItemAccount.trim() || '1001',
        description: newItemDesc.trim(),
        rate_type: newItemRateType,
        quantity: parseFloat(newItemQty) || 1.0,
        rate: parseFloat(newItemRate) || 0.0,
        fringe_percentage: parseFloat(newItemFringe) || 0.0,
        actual_cost: 0.0,
        notes: newItemNotes.trim(),
      },
      activeBudget.id
    );

    if (currentWorkspace?.id) {
      logStudioAction({
        workspace: currentWorkspace.id,
        actor_name: currentUserRole === 'OWNER' ? 'Studio Line Producer' : `${currentUserRole} Lead`,
        actor_role: currentUserRole,
        action_type: 'BUDGET_UPDATE',
        department: 'BUDGET',
        description: `Added line item "${newItemDesc.trim()}" (Code: ${newItemAccount.trim() || '1001'}) at $${parseFloat(newItemRate) || 0} (${newItemRateType})`,
      });
    }

    setSelectedCategoryForNewItem(null);
    setNewItemDesc('');
    setNewItemAccount('');
    setNewItemNotes('');
  };

  const handleExportTopSheetCSV = () => {
    if (!activeBudget) return;
    const lines: string[] = [];

    lines.push(`PRODUCTION BUDGET TOP-SHEET & EXPENSE LEDGER`);
    lines.push(`Title,${activeBudget.title}`);
    lines.push(`Screenplay,${screenplayNode.title || 'Master Screenplay'}`);
    lines.push(`Currency,${activeBudget.currency}`);
    lines.push(`Export Date,${new Date().toLocaleDateString()}`);
    lines.push('');

    // Summary Top-Sheet
    lines.push('--- EXECUTIVE TOP-SHEET SUMMARY ---');
    lines.push('Tier,Estimated Budget,Actual Recorded,Variance');
    lines.push(`Above-The-Line (ATL),${activeBudget.atl_subtotal},-,${activeBudget.atl_subtotal}`);
    lines.push(`Below-The-Line Production (BTL),${activeBudget.btl_production_subtotal},-,${activeBudget.btl_production_subtotal}`);
    lines.push(`Below-The-Line Post-Production (BTL),${activeBudget.btl_post_subtotal},-,${activeBudget.btl_post_subtotal}`);
    lines.push(`Other & Administrative,${activeBudget.other_subtotal},-,${activeBudget.other_subtotal}`);
    lines.push(`Subtotal Before Contingency,${activeBudget.subtotal_before_contingency},-,-`);
    lines.push(`Contingency (${activeBudget.contingency_percentage}%),${activeBudget.contingency_amount},-,-`);
    lines.push(`GRAND TOTAL,${activeBudget.grand_total},${activeBudget.actual_total},${activeBudget.variance}`);
    lines.push('');

    // Detailed Ledger by Category
    lines.push('--- DETAILED DEPARTMENT ACCOUNT LEDGER ---');
    lines.push(
      'Tier,Account Code,Department Category,Description,Rate Type,Qty,Rate,Fringe %,Estimated Total,Actual Cost,Variance,Notes'
    );

    const categories = activeBudget.categories || [];
    categories.forEach((cat) => {
      lines.push(
        `[CATEGORY],${cat.code},"${cat.name}",-- Subtotal --,,,,,"${cat.subtotal_estimated}","${cat.subtotal_actual}","${cat.subtotal_variance}",`
      );
      (cat.line_items || []).forEach((item) => {
        lines.push(
          `"${cat.tier}","${item.account_code}","${cat.name}","${item.description.replace(/"/g, '""')}","${item.rate_type}",${item.quantity},${item.rate},${item.fringe_percentage}%,${item.estimated_total},${item.actual_cost},${item.variance},"${(item.notes || '').replace(/"/g, '""')}"`
        );
      });
    });

    const csvContent = lines.join('\n');
    const safeTitle = (activeBudget.title || 'Production_Budget').replace(/\s+/g, '_');
    downloadFile(csvContent, `${safeTitle}_TopSheet.csv`, 'text/csv;charset=utf-8');
  };

  // Group categories by tier
  const categoriesByTier = useMemo(() => {
    const map: Record<BudgetTier, BudgetCategory[]> = {
      ATL: [],
      BTL_PRODUCTION: [],
      BTL_POST: [],
      OTHER: [],
    };
    if (!activeBudget?.categories) return map;
    activeBudget.categories.forEach((c) => {
      if (map[c.tier]) {
        map[c.tier].push(c);
      } else {
        map.OTHER.push(c);
      }
    });
    return map;
  }, [activeBudget]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                {activeBudget ? activeBudget.title : 'Production Budget'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FINANCIAL TOP-SHEET
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{activeBudget?.categories?.length || 0} Categories</span>
              <span>•</span>
              <span>Currency: {activeBudget?.currency || 'USD'}</span>
              <span>•</span>
              <span>Contingency: {activeBudget?.contingency_percentage || 10}%</span>
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Budget Switcher Dropdown */}
          {budgets.length > 1 && (
            <select
              value={activeBudget?.id || ''}
              onChange={(e) => setActiveBudget(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.currency})
                </option>
              ))}
            </select>
          )}

          {/* New Budget Button */}
          <button
            onClick={() => setIsNewBudgetModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700"
            title="Create a new budget draft"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Draft</span>
          </button>

          {/* Auto-populate Button */}
          {activeBudget && (
            <button
              onClick={handleAutoPopulate}
              disabled={isPopulating}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium transition-all disabled:opacity-50"
              title="Auto-calculate Cast (DOOD), Crew days, Props & ADR session line items"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isPopulating ? 'animate-spin' : 'text-emerald-400'}`} />
              <span>{isPopulating ? 'Calculating...' : 'Auto-Populate Workspace'}</span>
            </button>
          )}

          {/* Add Category Button */}
          {activeBudget && (
            <button
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Category</span>
            </button>
          )}

          {/* Export CSV Top-Sheet */}
          {activeBudget && (
            <button
              onClick={handleExportTopSheetCSV}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700"
              title="Download studio financial top-sheet CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700"
            title="Print printable budget sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* If no budget exists */}
        {!activeBudget ? (
          <div className="max-w-md mx-auto my-16 text-center space-y-4 p-8 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <DollarSign className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-white">No Production Budget Found</h2>
            <p className="text-xs text-slate-400">
              Create a multi-tier budget to manage Cast DOOD days, crew equipment packages, department unit costs,
              and live expense variance.
            </p>
            <button
              onClick={() => setIsNewBudgetModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-medium transition-colors"
            >
              Create Master Budget
            </button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 4 Big Executive Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Above-The-Line (ATL) */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 backdrop-blur shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-amber-400/90 font-mono mb-1">
                  <span className="flex items-center space-x-1.5">
                    <span>🎭</span>
                    <span>ABOVE-THE-LINE (ATL)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Story, Cast, Dir</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">
                  {formatMoney(activeBudget.atl_subtotal, activeBudget.currency)}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-2 flex items-center justify-between">
                  <span>Share of Total:</span>
                  <span className="font-semibold text-amber-300">
                    {activeBudget.grand_total > 0
                      ? `${((activeBudget.atl_subtotal / activeBudget.grand_total) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Card 2: BTL Production */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 backdrop-blur shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-cyan-400/90 font-mono mb-1">
                  <span className="flex items-center space-x-1.5">
                    <span>🎬</span>
                    <span>BTL PRODUCTION</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Crew, Gear, Art</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">
                  {formatMoney(activeBudget.btl_production_subtotal, activeBudget.currency)}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-2 flex items-center justify-between">
                  <span>Share of Total:</span>
                  <span className="font-semibold text-cyan-300">
                    {activeBudget.grand_total > 0
                      ? `${((activeBudget.btl_production_subtotal / activeBudget.grand_total) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Card 3: BTL Post */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-indigo-400/90 font-mono mb-1">
                  <span className="flex items-center space-x-1.5">
                    <span>🎧</span>
                    <span>BTL POST-PRODUCTION</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Sound, ADR, Edit</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">
                  {formatMoney(activeBudget.btl_post_subtotal, activeBudget.currency)}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-2 flex items-center justify-between">
                  <span>Share of Total:</span>
                  <span className="font-semibold text-indigo-300">
                    {activeBudget.grand_total > 0
                      ? `${((activeBudget.btl_post_subtotal / activeBudget.grand_total) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </div>
              </div>

              {/* Card 4: Grand Total & Live Variance */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/40 backdrop-blur shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-emerald-400/90 font-mono mb-1">
                  <span className="flex items-center space-x-1.5">
                    <span>📈</span>
                    <span>GRAND TOTAL</span>
                  </span>
                  <span className="text-[10px] text-slate-400">+{activeBudget.contingency_percentage}% Cont.</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">
                  {formatMoney(activeBudget.grand_total, activeBudget.currency)}
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">
                    Actual: {formatMoney(activeBudget.actual_total, activeBudget.currency)}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      activeBudget.variance >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {activeBudget.variance >= 0 ? (
                      <>
                        <TrendingDown className="w-2.5 h-2.5" />
                        <span>+{formatMoney(activeBudget.variance, activeBudget.currency)} under</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-2.5 h-2.5" />
                        <span>{formatMoney(activeBudget.variance, activeBudget.currency)} over</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Department Category Ledger by Tier */}
            {(['ATL', 'BTL_PRODUCTION', 'BTL_POST', 'OTHER'] as BudgetTier[]).map((tierKey) => {
              const tierCategories = categoriesByTier[tierKey] || [];
              const tierInfo = TIER_CONFIG[tierKey];

              if (tierCategories.length === 0) return null;

              return (
                <div key={tierKey} className="space-y-4 pt-2">
                  {/* Tier Title Banner */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{tierInfo.icon}</span>
                      <h2 className={`text-sm font-mono font-bold uppercase tracking-wider ${tierInfo.color}`}>
                        {tierInfo.label}
                      </h2>
                    </div>
                  </div>

                  {/* Categories inside this tier */}
                  <div className="space-y-4">
                    {tierCategories.map((category) => {
                      const isCollapsed = Boolean(collapsedCategories[category.id]);
                      const lineItems = category.line_items || [];

                      return (
                        <div
                          key={category.id}
                          className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-sm"
                        >
                          {/* Category Header Row */}
                          <div className="p-3.5 bg-slate-900/90 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleCategoryCollapse(category.id)}
                                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {category.code}
                              </span>
                              <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                                {category.name}
                              </h3>
                              <span className="text-[11px] font-mono text-slate-500">
                                ({lineItems.length} item{lineItems.length === 1 ? '' : 's'})
                              </span>
                            </div>

                            {/* Subtotals & Category Actions */}
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-3 text-xs font-mono">
                                <div>
                                  <span className="text-slate-500 mr-1.5">Est:</span>
                                  <span className="font-semibold text-slate-200">
                                    {formatMoney(category.subtotal_estimated, activeBudget.currency)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 mr-1.5">Act:</span>
                                  <span className="font-semibold text-slate-300">
                                    {formatMoney(category.subtotal_actual, activeBudget.currency)}
                                  </span>
                                </div>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    category.subtotal_variance >= 0
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {category.subtotal_variance >= 0 ? '+' : ''}
                                  {formatMoney(category.subtotal_variance, activeBudget.currency)}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 no-print">
                                <button
                                  onClick={() => {
                                    setSelectedCategoryForNewItem(category.id);
                                    setNewItemAccount(
                                      `${category.code}${String(lineItems.length + 1).padStart(2, '0')}`
                                    );
                                  }}
                                  className="px-2 py-1 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white transition-colors flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Item</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete category "${category.name}" and all its line items?`)) {
                                      deleteBudgetCategoryItem(category.id, activeBudget.id);
                                    }
                                  }}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Line Items Table */}
                          {!isCollapsed && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-mono">
                                <thead>
                                  <tr className="border-b border-slate-800/80 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/40">
                                    <th className="py-2.5 px-3 w-20">Acct #</th>
                                    <th className="py-2.5 px-3">Description</th>
                                    <th className="py-2.5 px-3 w-24">Rate Type</th>
                                    <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                                    <th className="py-2.5 px-3 w-24 text-right">Rate</th>
                                    <th className="py-2.5 px-3 w-20 text-right">Fringe %</th>
                                    <th className="py-2.5 px-3 w-28 text-right font-semibold text-slate-300">
                                      Est Total
                                    </th>
                                    <th className="py-2.5 px-3 w-28 text-right font-semibold text-cyan-300">
                                      Actual Cost
                                    </th>
                                    <th className="py-2.5 px-3 w-24 text-right">Variance</th>
                                    <th className="py-2.5 px-3 w-36">Notes</th>
                                    <th className="py-2.5 px-3 w-12 text-center no-print">Del</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {lineItems.length === 0 ? (
                                    <tr>
                                      <td colSpan={11} className="py-6 text-center text-slate-500 text-xs italic">
                                        No line items in this category. Click &quot;+ Item&quot; to add one.
                                      </td>
                                    </tr>
                                  ) : (
                                    lineItems.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="py-2 px-3 text-slate-400 font-bold text-[11px]">
                                          {item.account_code}
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-medium text-slate-100">{item.description}</div>
                                          {item.character_name && (
                                            <span className="text-[10px] text-amber-400/80 mr-2">
                                              Talent: {item.character_name}
                                            </span>
                                          )}
                                          {item.breakdown_element_name && (
                                            <span className="text-[10px] text-cyan-400/80">
                                              Element: {item.breakdown_element_name}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-slate-400">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700">
                                            {item.rate_type}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-200">
                                          {item.quantity}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-200">
                                          {formatMoney(item.rate, activeBudget.currency)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-400">
                                          {item.fringe_percentage}%
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-white">
                                          {formatMoney(item.estimated_total, activeBudget.currency)}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <input
                                            type="number"
                                            step="0.01"
                                            defaultValue={item.actual_cost}
                                            onBlur={(e) => {
                                              const val = parseFloat(e.target.value) || 0.0;
                                              if (val !== parseFloat(String(item.actual_cost))) {
                                                updateBudgetLineItemItem(
                                                  item.id,
                                                  { actual_cost: val },
                                                  activeBudget.id
                                                );
                                              }
                                            }}
                                            className="w-24 text-right bg-slate-950/80 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
                                          />
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <span
                                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              item.variance >= 0
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-rose-500/10 text-rose-400'
                                            }`}
                                          >
                                            {item.variance >= 0 ? '+' : ''}
                                            {formatMoney(item.variance, activeBudget.currency)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-[11px] text-slate-400 truncate max-w-xs" title={item.notes}>
                                          {item.notes || '-'}
                                        </td>
                                        <td className="py-2 px-3 text-center no-print">
                                          <button
                                            onClick={() => deleteBudgetLineItemItem(item.id, activeBudget.id)}
                                            className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                            title="Delete line item"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: New Production Budget */}
      {isNewBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Create Production Budget Draft</span>
            </h3>
            <form onSubmit={handleCreateBudgetSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Budget Title</label>
                <input
                  type="text"
                  value={newBudgetTitle}
                  onChange={(e) => setNewBudgetTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Currency</label>
                  <select
                    value={newBudgetCurrency}
                    onChange={(e) => setNewBudgetCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contingency %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newBudgetContingency}
                    onChange={(e) => setNewBudgetContingency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewBudgetModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Category */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              <span>Add Department Category</span>
            </h3>
            <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-400 mb-1">Account Code</label>
                  <input
                    type="text"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    placeholder="7000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Category Name</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="MARKETING & PUBLICITY"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white uppercase focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Budget Tier</label>
                <select
                  value={newCatTier}
                  onChange={(e) => setNewCatTier(e.target.value as BudgetTier)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ATL">Above-The-Line (ATL)</option>
                  <option value="BTL_PRODUCTION">Below-The-Line Production (BTL)</option>
                  <option value="BTL_POST">Below-The-Line Post-Production (BTL)</option>
                  <option value="OTHER">Other / Administrative</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Line Item */}
      {selectedCategoryForNewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Budget Line Item</span>
            </h3>
            <form onSubmit={handleCreateLineItemSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Account Code</label>
                  <input
                    type="text"
                    value={newItemAccount}
                    onChange={(e) => setNewItemAccount(e.target.value)}
                    placeholder="1001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="First Assistant Camera (1st AC)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Rate Type</label>
                  <select
                    value={newItemRateType}
                    onChange={(e) => setNewItemRateType(e.target.value as RateType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {RATE_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Fringe %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newItemFringe}
                    onChange={(e) => setNewItemFringe(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Guidance</label>
                <input
                  type="text"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Guaranteed 12 shoot days on A-Camera unit"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryForNewItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Add Line Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
