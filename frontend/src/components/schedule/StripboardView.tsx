'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  MapPin,
  Plus,
  Trash2,
  GripVertical,
  Flag,
  Users,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  ShootingDay,
  StripboardItem,
  WorkspaceNode,
  Character,
} from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CallSheetModal } from './CallSheetModal';
import { CastDOODView } from './CastDOODView';

interface StripboardViewProps {
  screenplayNode: WorkspaceNode;
  scenes: WorkspaceNode[];
}

export function getStripColorClass(sceneTitle: string = '') {
  const upper = sceneTitle.toUpperCase();
  const isNight = /NIGHT/i.test(upper);
  const isExt = /^EXT/i.test(upper) || /[\.\s]EXT[\.\s]/i.test(upper);

  if (isNight && isExt) {
    return {
      bg: 'bg-emerald-100 text-emerald-950 border-emerald-300 hover:border-emerald-400',
      badgeBg: 'bg-emerald-800 text-white',
      isNight: true,
      isExt: true,
      label: 'NIGHT EXT',
    };
  } else if (isNight && !isExt) {
    return {
      bg: 'bg-blue-100 text-blue-950 border-blue-300 hover:border-blue-400',
      badgeBg: 'bg-blue-800 text-white',
      isNight: true,
      isExt: false,
      label: 'NIGHT INT',
    };
  } else if (!isNight && isExt) {
    return {
      bg: 'bg-amber-100 text-amber-950 border-amber-300 hover:border-amber-400',
      badgeBg: 'bg-amber-800 text-white',
      isNight: false,
      isExt: true,
      label: 'DAY EXT',
    };
  } else {
    return {
      bg: 'bg-zinc-100 text-zinc-900 border-zinc-300 hover:border-zinc-400',
      badgeBg: 'bg-zinc-800 text-white',
      isNight: false,
      isExt: false,
      label: 'DAY INT',
    };
  }
}

export function calculatePageEighths(wordCount: number) {
  const eighths = Math.max(1, Math.round(wordCount / 31.25));
  const fullPages = Math.floor(eighths / 8);
  const remEighths = eighths % 8;

  let fractionStr = '';
  if (fullPages > 0 && remEighths > 0) {
    fractionStr = `${fullPages} ${remEighths}/8`;
  } else if (fullPages > 0) {
    fractionStr = `${fullPages}`;
  } else {
    fractionStr = `${remEighths}/8`;
  }

  return {
    fractionStr,
    pagesDecimal: eighths / 8,
  };
}

export const StripboardView: React.FC<StripboardViewProps> = ({
  screenplayNode,
  scenes,
}) => {
  const {
    nodes,
    childrenMap,
    characters,
    schedules,
    activeScheduleId,
    shootingDays,
    stripboardItems,
    loadSchedules,
    setActiveSchedule,
    createScheduleItem,
    createShootingDayItem,
    deleteShootingDayItem,
    createStripItem,
    deleteStripItem,
    reorderStrips,
    populateStripsFromScenes,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<'stripboard' | 'dood'>('stripboard');
  const [isCallSheetOpen, setIsCallSheetOpen] = useState(false);

  // New Day form state
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayCallTime, setNewDayCallTime] = useState('07:00 AM');
  const [newDayLocation, setNewDayLocation] = useState('Studio Lot');
  const [newDayDate, setNewDayDate] = useState('');

  // New Banner state
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('COMPANY MOVE');
  const [newBannerDayId, setNewBannerDayId] = useState<string | null>(null);

  // Load schedules on mount
  useEffect(() => {
    if (screenplayNode.id) {
      loadSchedules(screenplayNode.id);
    }
  }, [screenplayNode.id, loadSchedules]);

  const activeSchedule = useMemo(() => {
    if (!activeScheduleId) return schedules[0] || null;
    return schedules.find((s) => s.id === activeScheduleId) || schedules[0] || null;
  }, [schedules, activeScheduleId]);

  // Sort days
  const sortedDays = useMemo(() => {
    return [...shootingDays].sort(
      (a, b) => a.order - b.order || a.day_number - b.day_number
    );
  }, [shootingDays]);

  // Group strips by day
  const stripsByDay = useMemo(() => {
    const map = new Map<string | null, StripboardItem[]>();
    map.set(null, []); // unscheduled
    sortedDays.forEach((d) => map.set(d.id, []));

    stripboardItems.forEach((strip) => {
      const dayId = strip.shooting_day;
      if (dayId && map.has(dayId)) {
        map.get(dayId)!.push(strip);
      } else {
        map.get(null)!.push(strip);
      }
    });

    // Ensure sorted by order
    map.forEach((list) => list.sort((a, b) => a.order - b.order));
    return map;
  }, [sortedDays, stripboardItems]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = stripboardItems.find((s) => s.id === active.id);
    if (!activeItem) return;

    // Check if dropped onto a shooting day header
    const overDay = sortedDays.find((d) => d.id === over.id);
    if (overDay) {
      const targetStrips = stripsByDay.get(overDay.id) || [];
      const newOrder = targetStrips.length + 1;
      await reorderStrips([
        { id: activeItem.id, order: newOrder, shooting_day: overDay.id },
      ]);
      return;
    }

    // Check if dropped onto another strip
    const overItem = stripboardItems.find((s) => s.id === over.id);
    if (!overItem) return;

    const targetDayId = overItem.shooting_day;
    const targetList = [...(stripsByDay.get(targetDayId) || [])];

    const oldIndex = targetList.findIndex((i) => i.id === activeItem.id);
    const newIndex = targetList.findIndex((i) => i.id === overItem.id);

    if (oldIndex !== -1 && oldIndex !== newIndex) {
      // Reordering within same day
      const reordered = [...targetList];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updates = reordered.map((item, idx) => ({
        id: item.id,
        order: idx + 1,
        shooting_day: targetDayId,
      }));
      await reorderStrips(updates);
    } else {
      // Moving across days
      const updates = [
        { id: activeItem.id, order: overItem.order, shooting_day: targetDayId },
      ];
      await reorderStrips(updates);
    }
  };

  // Handlers
  const handleCreateDefaultSchedule = async () => {
    const title = `${screenplayNode.title || 'Feature'} - Principal Photography`;
    await createScheduleItem(screenplayNode.id, title);
  };

  const handleCreateShootingDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchedule) return;

    const nextDayNum = sortedDays.length + 1;
    await createShootingDayItem({
      schedule: activeSchedule.id,
      day_number: nextDayNum,
      call_time: newDayCallTime || '07:00 AM',
      shooting_location: newDayLocation || 'Studio Lot',
      date: newDayDate || null,
      order: nextDayNum,
    });

    setIsAddingDay(false);
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchedule) return;

    await createStripItem({
      schedule: activeSchedule.id,
      is_banner: true,
      banner_title: newBannerTitle.trim().toUpperCase() || 'COMPANY MOVE',
      shooting_day: newBannerDayId,
      order: 999,
    });

    setIsAddingBanner(false);
    setNewBannerTitle('COMPANY MOVE');
  };

  const handleAutoPopulateScenes = async () => {
    if (!activeSchedule) return;
    const sceneIds = scenes.map((s) => s.id);
    await populateStripsFromScenes(activeSchedule.id, sceneIds);
  };

  const handleMoveStrip = async (stripId: string, targetDayId: string | null) => {
    const targetList = stripsByDay.get(targetDayId) || [];
    await reorderStrips([
      { id: stripId, order: targetList.length + 1, shooting_day: targetDayId },
    ]);
  };

  // Calculate day metrics
  const getDayStats = (dayId: string) => {
    const strips = stripsByDay.get(dayId) || [];
    let totalWordCount = 0;
    let sceneCount = 0;

    strips.forEach((strip) => {
      if (strip.is_banner || !strip.scene) return;
      sceneCount++;
      const scene = nodes[strip.scene];
      if (!scene) return;
      const bIds = childrenMap[scene.id] || [];
      bIds.forEach((bid) => {
        const b = nodes[bid];
        if (b?.content) {
          totalWordCount += b.content.trim().split(/\s+/).filter(Boolean).length;
        }
      });
    });

    const pageCalc = calculatePageEighths(totalWordCount);
    return {
      sceneCount,
      pageFraction: pageCalc.fractionStr,
      pagesDecimal: pageCalc.pagesDecimal,
    };
  };

  if (!activeSchedule && schedules.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-300">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-mono uppercase">
            Digital Stripboard & Shooting Schedule
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create an industry-standard Day/Night shooting board to sequence scenes into production shooting days, track cast DOOD work holds, and print daily call sheets.
          </p>
          <button
            onClick={handleCreateDefaultSchedule}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-semibold transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create Production Schedule</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden font-sans">
      {/* Top Header / View Switcher Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <select
              value={activeSchedule?.id || ''}
              onChange={(e) => setActiveSchedule(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-view switcher: Stripboard vs Cast DOOD */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('stripboard')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                activeTab === 'stripboard'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stripboard</span>
            </button>
            <button
              onClick={() => setActiveTab('dood')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-mono transition-colors ${
                activeTab === 'dood'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cast DOOD Matrix</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsCallSheetOpen(true)}
            disabled={sortedDays.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium disabled:opacity-40 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Daily Call Sheet</span>
          </button>

          <button
            onClick={handleAutoPopulateScenes}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition-colors"
            title="Import all scenes from screenplay into the unscheduled strips pool"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Populate Scenes ({scenes.length})</span>
          </button>

          <button
            onClick={() => {
              setIsAddingBanner(!isAddingBanner);
              setIsAddingDay(false);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Add Banner</span>
          </button>

          <button
            onClick={() => {
              setIsAddingDay(!isAddingDay);
              setIsAddingBanner(false);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors shadow-md shadow-cyan-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shooting Day</span>
          </button>
        </div>
      </div>

      {/* Inline Forms: Add Day & Add Banner */}
      {isAddingDay && (
        <form
          onSubmit={handleCreateShootingDay}
          className="border-b border-slate-800 bg-slate-900/95 p-4 flex flex-wrap items-end gap-3 animate-in fade-in slide-in-from-top-2 duration-150 text-xs font-mono"
        >
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              Day Number
            </label>
            <input
              type="text"
              disabled
              value={`Day ${sortedDays.length + 1}`}
              className="bg-slate-950 border border-slate-800 text-slate-400 rounded px-2.5 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              Shooting Date (Optional)
            </label>
            <input
              type="date"
              value={newDayDate}
              onChange={(e) => setNewDayDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              General Crew Call Time
            </label>
            <input
              type="text"
              value={newDayCallTime}
              onChange={(e) => setNewDayCallTime(e.target.value)}
              placeholder="e.g. 07:00 AM"
              className="bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              Location / Stage
            </label>
            <input
              type="text"
              value={newDayLocation}
              onChange={(e) => setNewDayLocation(e.target.value)}
              placeholder="e.g. Stage 3 & Backlot Alley"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors"
            >
              Confirm Day
            </button>
            <button
              type="button"
              onClick={() => setIsAddingDay(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isAddingBanner && (
        <form
          onSubmit={handleCreateBanner}
          className="border-b border-slate-800 bg-slate-900/95 p-4 flex flex-wrap items-end gap-3 animate-in fade-in slide-in-from-top-2 duration-150 text-xs font-mono"
        >
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              Banner Title / Note
            </label>
            <input
              type="text"
              value={newBannerTitle}
              onChange={(e) => setNewBannerTitle(e.target.value)}
              placeholder="e.g. COMPANY MOVE TO EXT. LOCATION, MEAL BREAK"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 uppercase"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              Assign to Day
            </label>
            <select
              value={newBannerDayId || ''}
              onChange={(e) => setNewBannerDayId(e.target.value || null)}
              className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="">Unscheduled Pool</option>
              {sortedDays.map((d) => (
                <option key={d.id} value={d.id}>
                  Day {d.day_number}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold transition-colors"
            >
              Insert Banner
            </button>
            <button
              type="button"
              onClick={() => setIsAddingBanner(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Main View: Stripboard DnD Canvas OR Cast DOOD Report */}
      {activeTab === 'dood' ? (
        <CastDOODView
          scheduleTitle={activeSchedule?.title || 'Production Schedule'}
          characters={characters}
          shootingDays={sortedDays}
          stripboardItems={stripboardItems}
          nodes={nodes}
          childrenMap={childrenMap}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-auto p-4 lg:p-6 bg-slate-950/70">
            <div className="flex space-x-4 min-w-max pb-8 items-start">
              {/* Shooting Days Buckets */}
              {sortedDays.map((day) => {
                const dayStrips = stripsByDay.get(day.id) || [];
                const stats = getDayStats(day.id);
                const stripIds = dayStrips.map((s) => s.id);

                return (
                  <div
                    key={day.id}
                    id={day.id}
                    className="w-80 sm:w-96 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shrink-0"
                  >
                    {/* Day Header */}
                    <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            DAY {day.day_number}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {day.date ? new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Date TBD'}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteShootingDayItem(day.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete this shooting day"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Day Metadata Pills */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
                        <div className="flex items-center space-x-1 truncate max-w-[180px]">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{day.shooting_location || 'Studio Lot'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="text-amber-300 font-bold">{day.call_time}</span>
                        </div>
                      </div>

                      {/* Accumulator / Stats */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
                        <span>{stats.sceneCount} SCENES</span>
                        <span className="text-cyan-400">{stats.pageFraction} PAGES</span>
                      </div>
                    </div>

                    {/* Droppable Strip Items List */}
                    <SortableContext items={stripIds} strategy={verticalListSortingStrategy}>
                      <div className="p-2 space-y-2 min-h-[220px] max-h-[60vh] overflow-y-auto">
                        {dayStrips.length === 0 ? (
                          <div className="p-8 text-center border-2 border-dashed border-slate-800/80 rounded-xl text-slate-600 font-mono text-xs">
                            Drop scene strips or banners here
                          </div>
                        ) : (
                          dayStrips.map((strip) => (
                            <SortableStripCard
                              key={strip.id}
                              strip={strip}
                              nodes={nodes}
                              childrenMap={childrenMap}
                              characters={characters}
                              sortedDays={sortedDays}
                              onMove={handleMoveStrip}
                              onDelete={deleteStripItem}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}

              {/* Unscheduled Scenes Pool Bucket */}
              <div
                id="unscheduled-pool"
                className="w-80 sm:w-96 flex flex-col bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl overflow-hidden shadow-xl shrink-0"
              >
                <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-300 uppercase">
                      Unscheduled Scenes Pool
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {(stripsByDay.get(null) || []).length} Strips
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Drag strips onto any Shooting Day to schedule them
                  </p>
                </div>

                <SortableContext
                  items={(stripsByDay.get(null) || []).map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-2 space-y-2 min-h-[220px] max-h-[60vh] overflow-y-auto">
                    {(stripsByDay.get(null) || []).length === 0 ? (
                      <div className="p-8 text-center text-slate-600 font-mono text-xs space-y-2">
                        <Sparkles className="w-6 h-6 mx-auto text-slate-700" />
                        <p>All scenes scheduled!</p>
                        <p className="text-[10px] text-slate-700">
                          Click &apos;Populate Scenes&apos; above if new scenes were created.
                        </p>
                      </div>
                    ) : (
                      (stripsByDay.get(null) || []).map((strip) => (
                        <SortableStripCard
                          key={strip.id}
                          strip={strip}
                          nodes={nodes}
                          childrenMap={childrenMap}
                          characters={characters}
                          sortedDays={sortedDays}
                          onMove={handleMoveStrip}
                          onDelete={deleteStripItem}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            </div>
          </div>
        </DndContext>
      )}

      {/* Call Sheet Modal */}
      <CallSheetModal
        isOpen={isCallSheetOpen}
        onClose={() => setIsCallSheetOpen(false)}
        schedule={activeSchedule}
        shootingDays={sortedDays}
        stripboardItems={stripboardItems}
        nodes={nodes}
        childrenMap={childrenMap}
        characters={characters}
      />
    </div>
  );
};

/* Sortable Strip Card Component */
interface SortableStripCardProps {
  strip: StripboardItem;
  nodes: Record<string, WorkspaceNode>;
  childrenMap: Record<string, string[]>;
  characters: Record<string, Character>;
  sortedDays: ShootingDay[];
  onMove: (stripId: string, dayId: string | null) => void;
  onDelete: (stripId: string) => void;
}

const SortableStripCard: React.FC<SortableStripCardProps> = ({
  strip,
  nodes,
  childrenMap,
  characters,
  sortedDays,
  onMove,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: strip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Day Break / Company Move Banner
  if (strip.is_banner) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="group relative p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 font-mono text-xs flex items-center justify-between shadow-sm cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center space-x-2" {...attributes} {...listeners}>
          <GripVertical className="w-3.5 h-3.5 text-purple-400/60 shrink-0" />
          <Flag className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-bold tracking-wider uppercase text-[11px]">
            {strip.banner_title || 'BANNER'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <select
            value={strip.shooting_day || ''}
            onChange={(e) => onMove(strip.id, e.target.value || null)}
            className="bg-purple-950 border border-purple-600/40 text-[10px] text-purple-300 rounded px-1.5 py-0.5 focus:outline-none"
          >
            <option value="">Pool</option>
            {sortedDays.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.day_number}
              </option>
            ))}
          </select>

          <button
            onClick={() => onDelete(strip.id)}
            className="p-1 text-purple-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Scene Strip Card
  const sceneNode = strip.scene ? nodes[strip.scene] : null;
  const heading = sceneNode?.title || 'INT. UNTITLED SCENE - DAY';
  const colorConfig = getStripColorClass(heading);

  // Cast speaking in this scene
  const blockIds = sceneNode ? childrenMap[sceneNode.id] || [] : [];
  let wordCount = 0;
  const speakingCast: string[] = [];

  blockIds.forEach((bid) => {
    const b = nodes[bid];
    if (b?.content) {
      wordCount += b.content.trim().split(/\s+/).filter(Boolean).length;
    }
    if (b?.type === 'dialogue') {
      const charId = b.properties?.character_id;
      const charName = (
        b.properties?.character_name ||
        (charId ? characters[charId]?.name : null) ||
        'CHAR'
      ).trim();
      if (!speakingCast.includes(charName)) {
        speakingCast.push(charName);
      }
    }
  });

  const pageCalc = calculatePageEighths(wordCount);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative p-2.5 rounded-xl border text-xs font-mono shadow-sm transition-all select-none ${colorConfig.bg}`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Drag handle & Scene heading */}
        <div className="flex items-start space-x-2 flex-1 min-w-0" {...attributes} {...listeners}>
          <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 shrink-0 mt-0.5 cursor-grab active:cursor-grabbing" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 mb-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider ${colorConfig.badgeBg}`}>
                {colorConfig.label}
              </span>
              <span className="text-[10px] font-bold opacity-75">
                {pageCalc.fractionStr} pgs
              </span>
            </div>
            <h4 className="font-bold text-xs uppercase leading-tight truncate">
              {heading}
            </h4>
          </div>
        </div>

        {/* Move dropdown & Delete */}
        <div className="flex items-center space-x-1 shrink-0">
          <select
            value={strip.shooting_day || ''}
            onChange={(e) => onMove(strip.id, e.target.value || null)}
            className="bg-black/10 border border-black/20 text-[10px] font-bold rounded px-1 py-0.5 focus:outline-none"
            title="Move strip to another shooting day"
          >
            <option value="">Pool</option>
            {sortedDays.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.day_number}
              </option>
            ))}
          </select>

          <button
            onClick={() => onDelete(strip.id)}
            className="p-1 opacity-40 hover:opacity-100 hover:text-rose-600 transition-opacity"
            title="Remove strip"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Speaking Cast List */}
      {speakingCast.length > 0 && (
        <div className="mt-1.5 pt-1 border-t border-black/10 flex items-center space-x-1 overflow-hidden">
          <Users className="w-2.5 h-2.5 opacity-60 shrink-0" />
          <div className="text-[9px] opacity-75 truncate">
            {speakingCast.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};
