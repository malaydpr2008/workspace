'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Printer,
  X,
  Loader2,
  TrendingUp,
  UserCheck,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Award,
  Film,
} from 'lucide-react';
import { WorkspaceNode, CoverageVerdict } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface ScriptCoverageModalProps {
  screenplayNode: WorkspaceNode;
  isOpen: boolean;
  onClose: () => void;
}

export const ScriptCoverageModal: React.FC<ScriptCoverageModalProps> = ({
  screenplayNode,
  isOpen,
  onClose,
}) => {
  const {
    currentWorkspace,
    coverageReports,
    loadCoverageReports,
    generateCoverageReportItem,
  } = useWorkspaceStore();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load coverage reports on mount
  useEffect(() => {
    if (isOpen && screenplayNode.id) {
      loadCoverageReports(screenplayNode.id).then((reports) => {
        if (reports.length > 0) {
          setSelectedReportId(reports[0].id);
        }
      });
    }
  }, [isOpen, screenplayNode.id, loadCoverageReports]);

  // Determine active report
  const activeReport =
    coverageReports.find((r) => r.id === selectedReportId) || coverageReports[0] || null;

  const handleGenerate = async () => {
    if (!currentWorkspace?.id || isGenerating) return;
    setIsGenerating(true);
    try {
      const created = await generateCoverageReportItem(
        screenplayNode.id,
        currentWorkspace.id
      );
      if (created) {
        setSelectedReportId(created.id);
      }
    } catch (err) {
      console.error('Failed to generate coverage report', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Verdict style helpers
  const getVerdictConfig = (verdict?: CoverageVerdict) => {
    switch (verdict) {
      case 'RECOMMEND':
        return {
          label: 'RECOMMEND',
          badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-500 shadow-emerald-500/20',
          stampClass: 'border-emerald-500 text-emerald-400',
          icon: Award,
          summary: 'High commercial & artistic readiness. Priority development & packaging.',
        };
      case 'CONSIDER':
        return {
          label: 'CONSIDER',
          badgeClass: 'bg-amber-950/80 text-amber-400 border-amber-500 shadow-amber-500/20',
          stampClass: 'border-amber-500 text-amber-400',
          icon: TrendingUp,
          summary: 'Strong foundation with targeted structural or character polish required.',
        };
      case 'PASS':
      default:
        return {
          label: 'PASS',
          badgeClass: 'bg-rose-950/80 text-rose-400 border-rose-500 shadow-rose-500/20',
          stampClass: 'border-rose-500 text-rose-400',
          icon: AlertTriangle,
          summary: 'Significant developmental rework required before packaging or production.',
        };
    }
  };

  const verdictConfig = getVerdictConfig(activeReport?.verdict);

  return (
    <>
      {/* =========================================================================
          SCREEN-ONLY MODAL (Interactive Dark Luxury Studio Design)
          ========================================================================= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 no-print overflow-y-auto">
        <div
          className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white font-mono tracking-tight">
                    Executive Script Coverage Report
                  </h2>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Studio Story Dept
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {screenplayNode.title || 'Screenplay'} • Commercial Feasibility & Analysis
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2.5">
              {/* Report History Switcher if multiple */}
              {coverageReports.length > 1 && (
                <select
                  value={activeReport?.id || ''}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {coverageReports.map((rep, idx) => (
                    <option key={rep.id} value={rep.id}>
                      Draft {coverageReports.length - idx}: {rep.verdict} (
                      {new Date(rep.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}

              {/* Generate New Coverage Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-mono font-medium disabled:opacity-50 transition-all shadow-sm"
                title="Run fresh studio script analysis and coverage"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isGenerating ? 'Analyzing...' : 'Generate New'}</span>
              </button>

              {/* Print / Export PDF Button */}
              <button
                onClick={handlePrint}
                disabled={!activeReport}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-medium disabled:opacity-40 transition-colors"
                title="Print or Export Coverage as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {!activeReport ? (
              // Empty State
              <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl max-w-xl mx-auto px-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                  <Film className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 font-mono">
                  No Executive Coverage Generated Yet
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-2 max-w-md mx-auto leading-relaxed">
                  Generate studio-grade script coverage analyzing 3-act executive synopsis,
                  commercial viability, character voice diagnostics, and production feasibility.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-mono font-semibold shadow-lg shadow-emerald-950 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isGenerating ? 'Analyzing Screenplay...' : 'Generate Executive Coverage'}</span>
                </button>
              </div>
            ) : (
              // Active Coverage Document View
              <div className="space-y-6">
                {/* Top Banner: Studio Executive Stamp & Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/70 border border-slate-800 rounded-2xl p-6">
                  {/* Verdict Rubber Stamp */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-800 text-center">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-2">
                      Studio Executive Verdict
                    </div>
                    <div
                      className={`inline-block border-4 px-6 py-2.5 rounded-xl font-mono font-black text-2xl tracking-widest uppercase rotate-[-2deg] shadow-lg ${verdictConfig.stampClass} ${verdictConfig.badgeClass}`}
                    >
                      {verdictConfig.label}
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-3 max-w-xs leading-snug">
                      {verdictConfig.summary}
                    </p>
                  </div>

                  {/* Diagnostic Score Meters */}
                  <div className="md:col-span-2 flex flex-col justify-center space-y-4">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <span>Studio Scorecard Meters</span>
                      <span className="text-emerald-400 font-mono text-xs">
                        Overall Rating:{' '}
                        {Math.round(
                          (activeReport.commercial_viability +
                            activeReport.character_score +
                            activeReport.pacing_score) /
                            3
                        )}
                        /100
                      </span>
                    </div>

                    {/* Commercial Viability Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300 flex items-center space-x-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Commercial Viability</span>
                        </span>
                        <span className="text-cyan-400 font-bold">
                          {activeReport.commercial_viability}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${activeReport.commercial_viability}%` }}
                        />
                      </div>
                    </div>

                    {/* Character Arc Score Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300 flex items-center space-x-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>Character Arcs & Voice</span>
                        </span>
                        <span className="text-purple-400 font-bold">
                          {activeReport.character_score}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${activeReport.character_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Narrative Pacing Score Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Narrative Pacing & Tension</span>
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {activeReport.pacing_score}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${activeReport.pacing_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formatted Logline Callout */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border-l-4 border-emerald-500 border-y border-r border-slate-800 shadow-md">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Executive Logline</span>
                  </div>
                  <p className="text-base sm:text-lg text-slate-100 font-serif italic leading-relaxed">
                    &ldquo;{activeReport.logline}&rdquo;
                  </p>
                </div>

                {/* 3-Act Executive Synopsis */}
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-slate-400 font-bold border-b border-slate-800/80 pb-2.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>3-Act Executive Synopsis</span>
                  </div>
                  <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                    {activeReport.synopsis}
                  </div>
                </div>

                {/* Strengths & Weaknesses 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold border-b border-slate-800 pb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Studio Strengths ({activeReport.strengths.length})</span>
                    </div>
                    <ul className="space-y-2.5 text-xs font-sans text-slate-300">
                      {activeReport.strengths.map((str, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses / Development Opportunities */}
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-slate-800 pb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Development Notes ({activeReport.weaknesses.length})</span>
                    </div>
                    <ul className="space-y-2.5 text-xs font-sans text-slate-300">
                      {activeReport.weaknesses.map((wk, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{wk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Production Feasibility & Casting Advice */}
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-slate-400 font-bold border-b border-slate-800/80 pb-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Production Feasibility & Packaging Advice</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                    {activeReport.production_notes ||
                      'Production scale is evaluated at medium tier with contained physical setups and balanced location distribution.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINT-ONLY HOLLYWOOD COVERAGE BINDER LAYOUT
          (Rendered cleanly for window.print() & PDF Export)
          ========================================================================= */}
      {activeReport && (
        <div className="hidden print:block font-mono text-black bg-white p-8 space-y-6">
          {/* Hollywood Studio Coverage Header Table */}
          <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-600 font-bold">
                STUDIO STORY DEPARTMENT • EXECUTIVE COVERAGE
              </div>
              <h1 className="text-2xl font-bold uppercase tracking-tight text-black mt-1">
                {activeReport.title}
              </h1>
              <div className="text-xs text-slate-700 mt-1">
                SCREENPLAY ID: {screenplayNode.id.substring(0, 8)} • ANALYST: STUDIO AI ENGINE
              </div>
            </div>
            <div className="text-right">
              {/* Verdict Stamp */}
              <div
                className={`inline-block border-2 border-black px-4 py-1.5 font-bold text-sm tracking-widest uppercase ${
                  activeReport.verdict === 'RECOMMEND'
                    ? 'coverage-verdict-recommend'
                    : activeReport.verdict === 'CONSIDER'
                    ? 'coverage-verdict-consider'
                    : 'coverage-verdict-pass'
                }`}
              >
                VERDICT: {activeReport.verdict}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">
                DATE: {new Date(activeReport.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Studio Metrics Table */}
          <div className="grid grid-cols-4 gap-4 p-3 border border-black text-xs">
            <div>
              <div className="text-[10px] uppercase text-slate-600">Commercial Score</div>
              <div className="text-base font-bold">{activeReport.commercial_viability}/100</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-600">Character Score</div>
              <div className="text-base font-bold">{activeReport.character_score}/100</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-600">Pacing Score</div>
              <div className="text-base font-bold">{activeReport.pacing_score}/100</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-600">Circulation</div>
              <div className="text-base font-bold">CONFIDENTIAL</div>
            </div>
          </div>

          {/* Logline Box */}
          <div className="border border-black p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-700">LOGLINE:</div>
            <p className="text-sm font-serif italic leading-relaxed text-black">
              &ldquo;{activeReport.logline}&rdquo;
            </p>
          </div>

          {/* 3-Act Executive Synopsis */}
          <div className="border border-black p-4 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-700">
              3-ACT EXECUTIVE SYNOPSIS:
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-line text-black">
              {activeReport.synopsis}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-black p-4 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-700">KEY STRENGTHS:</div>
              <ul className="text-xs space-y-1.5 list-disc pl-4 text-black">
                {activeReport.strengths.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>
            <div className="border border-black p-4 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-700">
                DEVELOPMENT OPPORTUNITIES:
              </div>
              <ul className="text-xs space-y-1.5 list-disc pl-4 text-black">
                {activeReport.weaknesses.map((wk, idx) => (
                  <li key={idx}>{wk}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Production Feasibility */}
          <div className="border border-black p-4 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-700">
              PRODUCTION FEASIBILITY & CASTING NOTES:
            </div>
            <p className="text-xs leading-relaxed text-black">
              {activeReport.production_notes ||
                'Feasible physical setup with standard principal photography footprint.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
