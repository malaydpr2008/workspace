'use client';

import React, { useMemo } from 'react';
import {
  Users,
  Calendar,
  Download,
} from 'lucide-react';
import {
  Character,
  ShootingDay,
  StripboardItem,
  WorkspaceNode,
} from '@/types/workspace';
import { calculateCastDOOD, exportDOODToCSV, DOODStatus } from '@/lib/dood';
import { downloadFile } from '@/lib/compiler';

interface CastDOODViewProps {
  scheduleTitle: string;
  characters: Record<string, Character>;
  shootingDays: ShootingDay[];
  stripboardItems: StripboardItem[];
  nodes: Record<string, WorkspaceNode>;
  childrenMap: Record<string, string[]>;
}

export const CastDOODView: React.FC<CastDOODViewProps> = ({
  scheduleTitle,
  characters,
  shootingDays,
  stripboardItems,
  nodes,
  childrenMap,
}) => {
  const characterList = useMemo(() => Object.values(characters), [characters]);

  const report = useMemo(() => {
    return calculateCastDOOD(
      characterList,
      shootingDays,
      stripboardItems,
      nodes,
      childrenMap
    );
  }, [characterList, shootingDays, stripboardItems, nodes, childrenMap]);

  const handleExportCSV = () => {
    const csv = exportDOODToCSV(report, scheduleTitle);
    const safeTitle = (scheduleTitle || 'schedule')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    downloadFile(csv, `${safeTitle}_cast_dood_report.csv`, 'text/csv;charset=utf-8');
  };

  const getStatusBadge = (status: DOODStatus) => {
    switch (status) {
      case 'SW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            SW
          </span>
        );
      case 'W':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            W
          </span>
        );
      case 'H':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            H
          </span>
        );
      case 'WF':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            WF
          </span>
        );
      case 'SWF':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            SWF
          </span>
        );
      case 'I':
      default:
        return <span className="text-slate-600 font-mono text-xs">—</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header & Legend Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Cast Day-Out-of-Days (DOOD) Report
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {report.days.length} Shooting Days
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Work & hold contractual tracking for speaking talent across production schedule
            </p>
          </div>
        </div>

        {/* Legend Pills & Export */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-500 mr-1 uppercase">Legend:</span>
            <span className="text-emerald-400 font-bold">SW: Start Work</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-bold">W: Work</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-bold">H: Hold</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-bold">WF: Finish</span>
            <span className="text-slate-600">•</span>
            <span className="text-purple-400 font-bold">SWF: 1-Day</span>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={report.rows.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium disabled:opacity-40 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main DOOD Matrix Table */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        {report.days.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 font-mono text-xs max-w-xl mx-auto space-y-2 mt-8">
            <Calendar className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-400 font-semibold">
              No Shooting Days configured in this schedule yet.
            </p>
            <p className="text-xs text-slate-500">
              Create shooting days on the Stripboard tab and assign scenes to generate the Cast DOOD matrix.
            </p>
          </div>
        ) : report.rows.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 font-mono text-xs max-w-xl mx-auto space-y-2 mt-8">
            <Users className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-400 font-semibold">
              No speaking cast detected in the screenplay.
            </p>
            <p className="text-xs text-slate-500">
              Add dialogue blocks with character cues in the screenplay editor.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 sticky left-0 z-20 bg-slate-950 border-r border-slate-800 min-w-[200px]">
                      Character
                    </th>
                    <th className="py-3 px-4 border-r border-slate-800 min-w-[140px]">
                      Actor / Talent
                    </th>
                    <th className="py-3 px-3 text-center border-r border-slate-800 w-24">
                      Work Days
                    </th>
                    <th className="py-3 px-3 text-center border-r border-slate-800 w-24">
                      Hold Days
                    </th>
                    {report.days.map((day) => (
                      <th
                        key={day.id}
                        className="py-3 px-3 text-center border-r border-slate-800 last:border-r-0 min-w-[90px]"
                      >
                        <div className="font-bold text-white">Day {day.day_number}</div>
                        <div className="text-[9px] text-slate-500 font-normal truncate max-w-[80px] mx-auto">
                          {day.date || day.call_time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.rows.map((row) => (
                    <tr
                      key={row.characterId}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-100 uppercase sticky left-0 z-10 bg-slate-900 border-r border-slate-800 truncate max-w-[200px]">
                        {row.characterName}
                      </td>
                      <td className="py-3 px-4 text-slate-400 border-r border-slate-800 truncate max-w-[140px]">
                        {row.actorName}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-cyan-300 bg-cyan-950/20 border-r border-slate-800">
                        {row.totalWorkDays}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-300 bg-amber-950/20 border-r border-slate-800">
                        {row.totalHoldDays}
                      </td>
                      {report.days.map((day) => (
                        <td
                          key={day.id}
                          className="py-3 px-3 text-center border-r border-slate-800 last:border-r-0"
                        >
                          {getStatusBadge(row.dayStatuses[day.id] || 'I')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950/90 border-t-2 border-slate-700 text-xs font-bold">
                    <td className="py-3 px-4 text-white uppercase sticky left-0 z-20 bg-slate-950 border-r border-slate-800">
                      Production Totals
                    </td>
                    <td className="py-3 px-4 text-slate-500 border-r border-slate-800">
                      {report.rows.length} Roles
                    </td>
                    <td className="py-3 px-3 text-center text-cyan-300 border-r border-slate-800">
                      {report.totalWorkDaysAll}
                    </td>
                    <td className="py-3 px-3 text-center text-amber-300 border-r border-slate-800">
                      {report.totalHoldDaysAll}
                    </td>
                    {report.days.map((day) => {
                      const workingOnDay = report.rows.filter((r) => {
                        const st = r.dayStatuses[day.id];
                        return st === 'SW' || st === 'W' || st === 'WF' || st === 'SWF';
                      }).length;

                      return (
                        <td
                          key={day.id}
                          className="py-3 px-3 text-center text-slate-300 border-r border-slate-800 last:border-r-0 text-[11px]"
                        >
                          {workingOnDay} on set
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
