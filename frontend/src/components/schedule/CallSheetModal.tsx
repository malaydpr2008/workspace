'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Clapperboard,
} from 'lucide-react';
import {
  ShootingSchedule,
  ShootingDay,
  StripboardItem,
  WorkspaceNode,
  Character,
} from '@/types/workspace';
import { getSceneNumber } from '@/lib/revision';

interface CallSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ShootingSchedule | null;
  shootingDays: ShootingDay[];
  stripboardItems: StripboardItem[];
  nodes: Record<string, WorkspaceNode>;
  childrenMap: Record<string, string[]>;
  characters: Record<string, Character>;
}

export const CallSheetModal: React.FC<CallSheetModalProps> = ({
  isOpen,
  onClose,
  schedule,
  shootingDays,
  stripboardItems,
  nodes,
  childrenMap,
  characters,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const sortedDays = useMemo(() => {
    return [...shootingDays].sort(
      (a, b) => a.order - b.order || a.day_number - b.day_number
    );
  }, [shootingDays]);

  const activeDay = useMemo(() => {
    if (selectedDayId) {
      return sortedDays.find((d) => d.id === selectedDayId) || sortedDays[0] || null;
    }
    return sortedDays[0] || null;
  }, [sortedDays, selectedDayId]);

  // Strips for this day
  const dayStrips = useMemo(() => {
    if (!activeDay) return [];
    return stripboardItems
      .filter((s) => s.shooting_day === activeDay.id && !s.is_banner)
      .sort((a, b) => a.order - b.order);
  }, [activeDay, stripboardItems]);

  // Speaking cast appearing on this day
  const dayCastList = useMemo(() => {
    if (!activeDay || dayStrips.length === 0) return [];

    const characterMap = new Map<string, { character: Character; sceneNumbers: string[] }>();

    dayStrips.forEach((strip, sIdx) => {
      if (!strip.scene) return;
      const sceneNode = nodes[strip.scene];
      if (!sceneNode) return;
      const sceneNum = getSceneNumber(sceneNode, sIdx);
      const blockIds = childrenMap[sceneNode.id] || [];

      blockIds.forEach((bid) => {
        const block = nodes[bid];
        if (block?.type === 'dialogue') {
          const charId = block.properties?.character_id;
          const charName = (
            block.properties?.character_name ||
            (charId ? characters[charId]?.name : null) ||
            'CHARACTER'
          ).trim();

          const key = charName.toUpperCase();
          if (!characterMap.has(key)) {
            const charObj = (charId && characters[charId]) || {
              id: charId || key,
              workspace: sceneNode.workspace,
              name: charName,
              avatar: '',
              metadata: {},
            };
            characterMap.set(key, { character: charObj, sceneNumbers: [] });
          }

          const entry = characterMap.get(key)!;
          if (!entry.sceneNumbers.includes(sceneNum)) {
            entry.sceneNumbers.push(sceneNum);
          }
        }
      });
    });

    return Array.from(characterMap.values());
  }, [activeDay, dayStrips, nodes, childrenMap, characters]);

  // Calculate total pages for day
  const totalDayPages = useMemo(() => {
    return dayStrips.reduce((acc, strip) => {
      if (!strip.scene) return acc;
      const scene = nodes[strip.scene];
      if (!scene) return acc;
      const bIds = childrenMap[scene.id] || [];
      let wordCount = 0;
      bIds.forEach((bid) => {
        const b = nodes[bid];
        if (b?.content) {
          wordCount += b.content.trim().split(/\s+/).filter(Boolean).length;
        }
      });
      // Standard: ~250 words per script page
      const pages = Math.max(0.125, wordCount / 250);
      return acc + pages;
    }, 0);
  }, [dayStrips, nodes, childrenMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
        {/* Top Modal Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Daily Call Sheet Generator
              </h2>
              <p className="text-xs text-slate-400">
                Official Hollywood studio production sheet with crew call, cast schedule, and scene order
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Day Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Select Day:</span>
              <select
                value={activeDay?.id || ''}
                onChange={(e) => setSelectedDayId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500"
              >
                {sortedDays.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.day_number} {d.date ? `(${d.date})` : ''} - Call: {d.call_time}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => window.print()}
              disabled={!activeDay}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Call Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Call Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-950/60 print:bg-white print:text-black print:p-0">
          {!activeDay ? (
            <div className="p-16 text-center text-slate-500 font-mono text-xs">
              No Shooting Days available to generate a call sheet.
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 print:border-black print:bg-white rounded-xl shadow-2xl p-6 lg:p-8 space-y-6 text-xs font-mono print:text-black">
              {/* Call Sheet Header Table */}
              <div className="border-2 border-slate-700 print:border-black rounded-lg p-4 space-y-4 bg-slate-950/50 print:bg-white">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 print:border-black pb-3 gap-2">
                  <div>
                    <h1 className="text-xl font-bold tracking-widest uppercase text-white print:text-black">
                      {schedule?.title || 'FEATURE PRODUCTION'}
                    </h1>
                    <div className="text-[11px] text-amber-400 font-bold tracking-wider uppercase print:text-black">
                      OFFICIAL DAILY CALL SHEET
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-cyan-400 print:text-black">
                      DAY {activeDay.day_number} OF {sortedDays.length}
                    </div>
                    <div className="text-xs text-slate-400 print:text-black">
                      {activeDay.date ? new Date(activeDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'DATE TBD'}
                    </div>
                  </div>
                </div>

                {/* Key Personnel & Crew Call Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">CREW CALL</span>
                    <span className="text-base font-bold text-amber-400 print:text-black">{activeDay.call_time}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">SHOOTING LOCATION</span>
                    <span className="font-semibold text-white print:text-black">{activeDay.shooting_location || 'STUDIO LOT'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">WEATHER / SUNRISE</span>
                    <span className="text-slate-300 print:text-black">Clear 68°F / 06:14 AM</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">NEAREST HOSPITAL</span>
                    <span className="text-rose-300 print:text-black font-semibold">Mercy Hospital (Emergency: 911)</span>
                  </div>
                </div>

                {activeDay.notes && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 print:border-black text-[11px] text-slate-300 print:text-black">
                    <strong className="text-amber-400 print:text-black mr-1 uppercase">DIRECTOR / AD NOTES:</strong>
                    {activeDay.notes}
                  </div>
                )}
              </div>

              {/* Scheduled Scenes Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 print:border-black">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 print:text-black">
                    SCHEDULE OF SCENES TO BE SHOT
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-bold print:text-black">
                    {dayStrips.length} SCENES • TOTAL EST: {totalDayPages.toFixed(2)} PAGES
                  </span>
                </div>

                <div className="border border-slate-800 print:border-black rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 print:bg-slate-100 border-b border-slate-800 print:border-black text-[10px] uppercase text-slate-400 print:text-black">
                        <th className="p-2 border-r border-slate-800 print:border-black w-14 text-center">SCENE</th>
                        <th className="p-2 border-r border-slate-800 print:border-black">SLUGLINE / DESCRIPTION</th>
                        <th className="p-2 border-r border-slate-800 print:border-black w-24 text-center">D / N</th>
                        <th className="p-2 border-r border-slate-800 print:border-black w-20 text-center">PAGES</th>
                        <th className="p-2 w-32">CAST NUMBERS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 print:divide-black">
                      {dayStrips.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">
                            No scenes placed in this shooting day yet.
                          </td>
                        </tr>
                      ) : (
                        dayStrips.map((strip, sIdx) => {
                          const scene = strip.scene ? nodes[strip.scene] : null;
                          const sceneNum = scene ? getSceneNumber(scene, sIdx) : `SC ${sIdx + 1}`;
                          const heading = scene?.title || 'INT. SCENE - DAY';
                          const isNight = /NIGHT/i.test(heading);
                          const isExt = /^EXT/i.test(heading);

                          // Estimate page length
                          const bIds = scene ? childrenMap[scene.id] || [] : [];
                          let wordCount = 0;
                          const castNames: string[] = [];

                          bIds.forEach((bid) => {
                            const b = nodes[bid];
                            if (b?.content) {
                              wordCount += b.content.trim().split(/\s+/).filter(Boolean).length;
                            }
                            if (b?.type === 'dialogue') {
                              const cName = b.properties?.character_name || 'CHAR';
                              if (!castNames.includes(cName)) castNames.push(cName);
                            }
                          });

                          const pagesEst = Math.max(0.125, wordCount / 250).toFixed(2);

                          return (
                            <tr key={strip.id} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                              <td className="p-2 font-bold text-center border-r border-slate-800 print:border-black text-cyan-300 print:text-black">
                                {sceneNum}
                              </td>
                              <td className="p-2 border-r border-slate-800 print:border-black font-semibold text-slate-100 print:text-black">
                                {heading}
                              </td>
                              <td className="p-2 border-r border-slate-800 print:border-black text-center text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${isNight ? 'bg-blue-950/40 text-blue-300 print:text-black' : 'bg-amber-950/40 text-amber-300 print:text-black'}`}>
                                  {isExt ? 'EXT' : 'INT'} {isNight ? 'NIGHT' : 'DAY'}
                                </span>
                              </td>
                              <td className="p-2 border-r border-slate-800 print:border-black text-center font-bold">
                                {pagesEst}
                              </td>
                              <td className="p-2 text-[10px] text-slate-300 print:text-black truncate max-w-[120px]">
                                {castNames.length > 0 ? castNames.join(', ') : '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cast Call Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 print:border-black">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 print:text-black">
                    CAST WORK & CALL SCHEDULE
                  </h3>
                  <span className="text-[10px] text-amber-400 font-bold print:text-black">
                    {dayCastList.length} ACTORS CALLED
                  </span>
                </div>

                <div className="border border-slate-800 print:border-black rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 print:bg-slate-100 border-b border-slate-800 print:border-black text-[10px] uppercase text-slate-400 print:text-black">
                        <th className="p-2 border-r border-slate-800 print:border-black w-10 text-center">ID</th>
                        <th className="p-2 border-r border-slate-800 print:border-black">CHARACTER</th>
                        <th className="p-2 border-r border-slate-800 print:border-black">ACTOR</th>
                        <th className="p-2 border-r border-slate-800 print:border-black w-24 text-center">PICK-UP</th>
                        <th className="p-2 border-r border-slate-800 print:border-black w-24 text-center">H/MU CALL</th>
                        <th className="p-2 border-r border-slate-800 print:border-black w-24 text-center">SET CALL</th>
                        <th className="p-2 w-28">SCENES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 print:divide-black">
                      {dayCastList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            No speaking cast required for today&apos;s scenes.
                          </td>
                        </tr>
                      ) : (
                        dayCastList.map(({ character, sceneNumbers }, idx) => {
                          const actor = character.metadata?.actor_name || character.metadata?.actor || 'TALENT TBD';
                          return (
                            <tr key={character.id} className="hover:bg-slate-800/20 print:hover:bg-transparent">
                              <td className="p-2 text-center font-bold text-slate-400 print:text-black border-r border-slate-800 print:border-black">
                                #{idx + 1}
                              </td>
                              <td className="p-2 font-bold text-white print:text-black border-r border-slate-800 print:border-black">
                                {character.name.toUpperCase()}
                              </td>
                              <td className="p-2 text-slate-300 print:text-black border-r border-slate-800 print:border-black">
                                {actor}
                              </td>
                              <td className="p-2 text-center border-r border-slate-800 print:border-black text-slate-400 print:text-black">
                                06:00 AM
                              </td>
                              <td className="p-2 text-center border-r border-slate-800 print:border-black text-slate-400 print:text-black">
                                06:30 AM
                              </td>
                              <td className="p-2 text-center font-bold text-amber-400 print:text-black border-r border-slate-800 print:border-black">
                                {activeDay.call_time}
                              </td>
                              <td className="p-2 text-[10px] text-cyan-300 print:text-black font-semibold">
                                {sceneNumbers.join(', ')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Department Notes & Special Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-slate-950 border border-slate-800 print:border-black rounded-lg space-y-1">
                  <div className="text-[10px] font-bold text-amber-400 print:text-black uppercase">
                    PROPS & COSTUMES
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-black leading-relaxed">
                    Check breakdown sheets for key hero props and wardrobe changes. All stunts require double wardrobe.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 print:border-black rounded-lg space-y-1">
                  <div className="text-[10px] font-bold text-cyan-400 print:text-black uppercase">
                    CAMERA & LIGHTING
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-black leading-relaxed">
                    A & B Cameras standard 35mm Prime package. Steadicam rig prepped for morning tracking shots.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 print:border-black rounded-lg space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 print:text-black uppercase">
                    SOUND & SPECIAL EFFECTS
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-black leading-relaxed">
                    Wild tracks & room tone recorded after wrap. Atmospheric hazer on stand-by for night interior.
                  </p>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="pt-4 border-t border-slate-800 print:border-black text-[10px] text-slate-500 print:text-black flex justify-between items-center">
                <span>GENERATED BY ANTIGRAVITY PRODUCTION STUDIO</span>
                <span>WRAP ESTIMATE: 07:00 PM • NO UNAUTHORIZED PHOTOS ON SET</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
