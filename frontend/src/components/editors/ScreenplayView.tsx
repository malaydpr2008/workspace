'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clapperboard,
  Film,
  Camera,
  Clock,
  Layers,
  Plus,
  Trash2,
  Check,
  Link as LinkIcon,
  X,
  LayoutGrid,
  User,
  FileUp,
  Tag,
  Upload,
  BarChart3,
  History,
  Calendar,
  MessageSquare,
  Mic,
  Music,
} from 'lucide-react';
import { WorkspaceNode, Shot, RevisionColor } from '@/types/workspace';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  compileScreenplayToFountain,
  compileScreenplayWithNotes,
  downloadFile,
  copyToClipboard,
} from '@/lib/compiler';
import { CharacterAutocompleteInput } from '@/components/editors/CharacterAutocompleteInput';
import { DocumentExportButton } from '@/components/export/DocumentExportButton';
import { StoryboardReelModal } from '@/components/storyboard/StoryboardReelModal';
import { BeatBoardView } from '@/components/views/BeatBoardView';
import { CharacterSidesModal } from '@/components/export/CharacterSidesModal';
import { ScriptImportModal } from '@/components/modals/ScriptImportModal';
import { BreakdownBadge } from '@/components/breakdown/BreakdownBadge';
import { BreakdownTagPopover } from '@/components/breakdown/BreakdownTagPopover';
import { BreakdownSheetView } from '@/components/breakdown/BreakdownSheetView';
import { ShotListTableView } from '@/components/storyboard/ShotListTableView';
import { ProductionAnalyticsView } from '@/components/analytics/ProductionAnalyticsView';
import { StripboardView } from '@/components/schedule/StripboardView';
import { RevisionDraftSelector } from '@/components/editors/RevisionDraftSelector';
import { VersionHistoryModal } from '@/components/history/VersionHistoryModal';
import { ScriptNotesDrawer } from '@/components/notes/ScriptNotesDrawer';
import { TakeLoggerModal } from '@/components/storyboard/TakeLoggerModal';
import { ADRCueModal } from '@/components/audio/ADRCueModal';
import { ADRRecordingSheetView } from '@/components/audio/ADRRecordingSheetView';
import { AudioSpottingDrawer } from '@/components/audio/AudioSpottingDrawer';
import { exportProductionBibleZip } from '@/lib/productionBible';
import {
  getRevisionConfig,
  getSceneNumber,
  calculateLockedSceneNumber,
} from '@/lib/revision';

interface ScreenplayViewProps {
  node: WorkspaceNode;
}

export const ScreenplayView: React.FC<ScreenplayViewProps> = ({ node }) => {
  const {
    nodes,
    childrenMap,
    shotsByScene,
    characters,
    breakdownElements,
    currentWorkspace,
    notesByNode,
    adrCues,
    audioCuesByScene,
    loadNotesForWorkspace,
    loadBreakdownElements,
    loadSceneShots,
    loadNodeChildren,
    loadADRCues,
    loadAudioCuesForScene,
    updateNodeContent,
    updateNodeTitle,
    updateNodeProperties,
    updateNodeFields,
    changeBlockType,
    insertBlock,
    deleteNode,
    createSceneShot,
    attachBlockToShot,
    selectNode,
    saveStatus,
    untagBlockFromElement,
    uploadShotStoryboard,
  } = useWorkspaceStore();

  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [userSelectedSceneId, setUserSelectedSceneId] = useState<string | null>(null);
  const [isReelOpen, setIsReelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<
    'editor' | 'board' | 'shotlist' | 'breakdown' | 'analytics' | 'stripboard' | 'adr'
  >('editor');
  const [isSidesModalOpen, setIsSidesModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Script Marginalia / Review Notes Drawer & Take Logger State
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [notesAnchorNodeId, setNotesAnchorNodeId] = useState<string | null>(null);
  const [takeLoggerShot, setTakeLoggerShot] = useState<Shot | null>(null);

  // Audio Spotting Drawer & ADR Cue Modal State
  const [isAudioSpottingOpen, setIsAudioSpottingOpen] = useState(false);
  const [audioSpottingScene, setAudioSpottingScene] = useState<WorkspaceNode | null>(null);
  const [activeADRBlock, setActiveADRBlock] = useState<WorkspaceNode | null>(null);

  // Breakdown tag popover state
  const [activeTagPopoverBlockId, setActiveTagPopoverBlockId] = useState<string | null>(null);
  const [popoverInitialText, setPopoverInitialText] = useState('');

  // New shot form state
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [newShotNumber, setNewShotNumber] = useState('');
  const [newShotType, setNewShotType] = useState('CLOSE-UP');
  const [newShotLens, setNewShotLens] = useState('50mm Anamorphic');
  const [newShotDuration, setNewShotDuration] = useState('3.0');
  const [newShotUrl, setNewShotUrl] = useState('');
  const [newShotFile, setNewShotFile] = useState<File | null>(null);
  const [isUploadingSidebarShotId, setIsUploadingSidebarShotId] = useState<string | null>(null);

  const shotSidebarFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newShotFileInputRef = useRef<HTMLInputElement | null>(null);

  // Refs for focusing after keyboard actions
  const blockInputRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});

  const isScene = node.type === 'scene';

  const scenes: WorkspaceNode[] = useMemo(() => {
    if (isScene) return [node];
    const childIds = childrenMap[node.id] || [];
    return childIds
      .map((cid) => nodes[cid])
      .filter((n): n is WorkspaceNode => n?.type === 'scene');
  }, [isScene, node, childrenMap, nodes]);

  const activeSceneId = isScene
    ? node.id
    : (userSelectedSceneId && scenes.some((s) => s.id === userSelectedSceneId)
        ? userSelectedSceneId
        : scenes[0]?.id) || '';

  useEffect(() => {
    loadBreakdownElements();
  }, [loadBreakdownElements]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadNotesForWorkspace(currentWorkspace.id);
      loadADRCues(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadNotesForWorkspace, loadADRCues]);

  useEffect(() => {
    if (activeSceneId) {
      loadSceneShots(activeSceneId);
      loadAudioCuesForScene(activeSceneId);
      if (!childrenMap[activeSceneId]) {
        loadNodeChildren(activeSceneId);
      }
    }
  }, [activeSceneId, loadSceneShots, loadAudioCuesForScene, loadNodeChildren, childrenMap]);

  const currentScene = nodes[activeSceneId] || (isScene ? node : null);
  const sceneBlocks = currentScene
    ? (childrenMap[currentScene.id] || [])
        .map((cid) => nodes[cid])
        .filter((n): n is WorkspaceNode => Boolean(n))
    : [];

  const shots: Shot[] = activeSceneId ? shotsByScene[activeSceneId] || [] : [];
  const activeShot = shots.find((s) => s.id === activeShotId) || shots[0] || null;

  // Hollywood Revision and Lock state
  const activeRevisionColor = (node.revision_color || node.properties?.revision_color || 'WHITE') as RevisionColor;
  const isScreenplayLocked = Boolean(node.is_locked || node.properties?.is_locked);
  const revisionConfig = getRevisionConfig(activeRevisionColor);

  const handleSelectRevisionColor = async (color: RevisionColor) => {
    await updateNodeFields(node.id, {
      revision_color: color,
      properties: { ...node.properties, revision_color: color },
    });
  };

  const handleToggleLock = async () => {
    const nextLocked = !isScreenplayLocked;
    await updateNodeFields(node.id, {
      is_locked: nextLocked,
      properties: { ...node.properties, is_locked: nextLocked },
    });
  };

  const handleAddScene = async (afterSceneId?: string) => {
    const insertAfterIndex = afterSceneId
      ? scenes.findIndex((s) => s.id === afterSceneId)
      : scenes.length - 1;

    let sceneNumber: string;
    let title: string;

    if (isScreenplayLocked) {
      sceneNumber = calculateLockedSceneNumber(scenes, insertAfterIndex);
      title = `SCENE ${sceneNumber} - INT. NEW LOCATION - DAY`;
    } else {
      sceneNumber = String(scenes.length + 1);
      title = `SCENE ${sceneNumber} - INT. LOCATION - DAY`;
    }

    const parentId = isScene ? node.parent || node.id : node.id;
    const afterNodeId = afterSceneId || (scenes.length > 0 ? scenes[scenes.length - 1].id : null);

    const created = await insertBlock(
      parentId,
      'scene',
      afterNodeId,
      '',
      { scene_number: sceneNumber },
      {
        title,
        revision_color: activeRevisionColor,
        is_locked: isScreenplayLocked,
        revision_asterisk: activeRevisionColor !== 'WHITE',
      }
    );

    if (created) {
      setUserSelectedSceneId(created.id);
      await insertBlock(
        created.id,
        'action',
        null,
        'Describe scene action and atmosphere...',
        {},
        {
          revision_color: activeRevisionColor,
          revision_asterisk: activeRevisionColor !== 'WHITE',
        }
      );
    }
  };

  // Set of block IDs covered by the active shot
  const coveredBlockIds = useMemo(() => {
    const ids = new Set<string>();
    if (activeShot?.blocks) {
      activeShot.blocks.forEach((b) => ids.add(b.id));
    }
    return ids;
  }, [activeShot]);

  // Export handlers
  const handleExportFountain = () => {
    const content = compileScreenplayToFountain(node, nodes, childrenMap, characters);
    const filename = `${(node.title || 'screenplay').toLowerCase().replace(/\s+/g, '_')}.fountain`;
    downloadFile(content, filename, 'text/plain;charset=utf-8');
  };

  const handleExportPlainText = () => {
    const content = compileScreenplayToFountain(node, nodes, childrenMap, characters);
    const filename = `${(node.title || 'screenplay').toLowerCase().replace(/\s+/g, '_')}.txt`;
    downloadFile(content, filename, 'text/plain;charset=utf-8');
  };

  const handleExportWithNotes = () => {
    const content = compileScreenplayWithNotes(
      node,
      nodes,
      childrenMap,
      characters,
      notesByNode
    );
    const filename = `${(node.title || 'screenplay').toLowerCase().replace(/\s+/g, '_')}_annotated_notes.fountain`;
    downloadFile(content, filename, 'text/plain;charset=utf-8');
  };

  const totalNotesCount = useMemo(() => {
    return Object.values(notesByNode).reduce((acc, list) => acc + list.length, 0);
  }, [notesByNode]);

  const totalUnresolvedNotesCount = useMemo(() => {
    return Object.values(notesByNode).reduce(
      (acc, list) => acc + list.filter((n) => !n.is_resolved).length,
      0
    );
  }, [notesByNode]);

  const handleCopyClipboard = async () => {
    const content = compileScreenplayToFountain(node, nodes, childrenMap, characters);
    return await copyToClipboard(content);
  };

  const handleExportProductionBible = async () => {
    try {
      await exportProductionBibleZip(
        node,
        nodes,
        childrenMap,
        characters,
        shotsByScene,
        breakdownElements
      );
    } catch (err) {
      console.error('Failed to export production bible', err);
    }
  };

  // Collect all screenplay subtree nodes for version history diffing
  const screenplaySubtreeNodes = useMemo(() => {
    const result: WorkspaceNode[] = [];
    const collect = (currId: string) => {
      const n = nodes[currId];
      if (n) result.push(n);
      const childIds = childrenMap[currId] || [];
      childIds.forEach(collect);
    };
    collect(node.id);
    return result;
  }, [node.id, nodes, childrenMap]);

  // Focus helper
  const focusBlock = (blockId: string) => {
    setTimeout(() => {
      blockInputRefs.current[blockId]?.focus();
    }, 50);
  };

  // Keyboard handlers for standard Hollywood script flow
  const handleSceneHeadingKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!currentScene) return;
      const newBlock = await insertBlock(currentScene.id, 'action', null, '');
      if (newBlock) focusBlock(newBlock.id);
    }
  };

  const handleActionKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: WorkspaceNode,
    idx: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!currentScene) return;

      // Enter on empty action converts to dialogue
      if (!block.content.trim()) {
        await changeBlockType(block.id, 'dialogue', { character_name: 'CHARACTER' });
        focusBlock(`${block.id}-char`);
        return;
      }

      // Enter on non-empty action creates new action block below
      const newBlock = await insertBlock(currentScene.id, 'action', block.id, '');
      if (newBlock) focusBlock(newBlock.id);
    } else if (e.key === 'Backspace' && !block.content) {
      e.preventDefault();
      const prevBlock = sceneBlocks[idx - 1];
      await deleteNode(block.id);
      if (prevBlock) focusBlock(prevBlock.id);
    }
  };

  const handleDialogueKeyDown = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: WorkspaceNode,
    idx: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!currentScene) return;

      // Enter on dialogue creates new dialogue with same or new character
      const charName = block.properties?.character_name || 'CHARACTER';
      const newBlock = await insertBlock(currentScene.id, 'dialogue', block.id, '', {
        character_name: charName,
      });
      if (newBlock) focusBlock(`${newBlock.id}-char`);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab toggles or adds parenthetical
      const currentParen = block.properties?.parenthetical || '';
      await updateNodeProperties(block.id, {
        parenthetical: currentParen ? '' : 'whispering',
      });
      if (!currentParen) {
        focusBlock(`${block.id}-paren`);
      }
    } else if (e.key === 'Backspace' && !block.content) {
      e.preventDefault();
      const prevBlock = sceneBlocks[idx - 1];
      await deleteNode(block.id);
      if (prevBlock) focusBlock(prevBlock.id);
    }
  };

  const handleOpenTagPopover = (blockId: string) => {
    let selectedText = '';
    const inputEl = blockInputRefs.current[blockId];
    if (inputEl && 'selectionStart' in inputEl && 'selectionEnd' in inputEl) {
      const start = inputEl.selectionStart || 0;
      const end = inputEl.selectionEnd || 0;
      if (end > start) {
        selectedText = inputEl.value.substring(start, end).trim();
      }
    }
    setPopoverInitialText(selectedText);
    setActiveTagPopoverBlockId((prev) => (prev === blockId ? null : blockId));
  };

  const getBlockBreakdownElements = (blockId: string) => {
    return Object.values(breakdownElements).filter((el) =>
      el.block_ids?.includes(blockId)
    );
  };

  const handleCreateShotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScene || !newShotNumber.trim()) return;

    const shot = await createSceneShot(currentScene.id, {
      shot_number: newShotNumber.trim(),
      shot_type: newShotType,
      lens: newShotLens,
      duration_seconds: parseFloat(newShotDuration) || 3.0,
      storyboard_url: newShotUrl.trim() || undefined,
    });

    if (shot) {
      if (newShotFile) {
        await uploadShotStoryboard(shot.id, newShotFile, currentScene.id);
        setNewShotFile(null);
      }
      setActiveShotId(shot.id);
      setNewShotNumber('');
      setNewShotUrl('');
      setIsAddingShot(false);
    }
  };

  const handleToggleCoverage = async (blockId: string) => {
    if (!activeShot || !currentScene) return;
    await attachBlockToShot(activeShot.id, blockId, currentScene.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                {node.title || 'Untitled Screenplay'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SCREENPLAY
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2">
              <span>{scenes.length} Scene{scenes.length === 1 ? '' : 's'}</span>
              <span>•</span>
              <span>{shots.length} Shot{shots.length === 1 ? '' : 's'}</span>
              {node.properties?.author && (
                <>
                  <span>•</span>
                  <span>Writer: {node.properties.author}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Status, Export & Scene Selector */}
        <div className="flex items-center space-x-3">
          {/* Hollywood Revision Draft Selector & Scene Lock */}
          <RevisionDraftSelector
            activeColor={activeRevisionColor}
            onSelectColor={handleSelectRevisionColor}
            isLocked={isScreenplayLocked}
            onToggleLock={handleToggleLock}
          />

          {/* Live Auto-save indicator */}
          <div className="flex items-center space-x-1.5 text-xs font-mono mr-1">
            {saveStatus === 'saving' && (
              <span className="flex items-center space-x-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-slate-500 text-[11px]">Synced</span>
            )}
          </div>

          {/* Segmented View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'editor'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Script</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'board'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Beat Board</span>
            </button>
            <button
              onClick={() => setViewMode('shotlist')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'shotlist'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Shot List</span>
            </button>
            <button
              onClick={() => setViewMode('breakdown')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'breakdown'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Breakdown Sheet</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'analytics'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setViewMode('stripboard')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'stripboard'
                  ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Stripboard</span>
            </button>
            <button
              onClick={() => setViewMode('adr')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                viewMode === 'adr'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>ADR Sheet</span>
            </button>
          </div>

          {/* Actor Sides Generator Button */}
          <button
            onClick={() => setIsSidesModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium transition-all"
            title="Generate and export actor sides"
          >
            <User className="w-3.5 h-3.5" />
            <span>Actor Sides</span>
          </button>

          {/* Draft History / Snapshots Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-medium transition-all"
            title="View version history, draft snapshots, and visual script diffing"
          >
            <History className="w-3.5 h-3.5" />
            <span>Draft History</span>
          </button>

          {/* Import Fountain Script Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-all"
            title="Import Fountain script text or file"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Import Fountain</span>
          </button>

          {/* Script Marginalia & Review Notes Drawer Toggle */}
          <button
            onClick={() => {
              if (!notesAnchorNodeId && currentScene) {
                setNotesAnchorNodeId(currentScene.id);
              }
              setIsNotesDrawerOpen(!isNotesDrawerOpen);
            }}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
              isNotesDrawerOpen
                ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                : totalUnresolvedNotesCount > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Toggle Script Marginalia & Review Notes Drawer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
            <span>Notes</span>
            {totalNotesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                {totalNotesCount}
              </span>
            )}
          </button>

          {/* Export Dropdown */}
          <DocumentExportButton
            primaryLabel="Export Fountain (.fountain)"
            primaryExtension="fountain"
            onExportPrimary={handleExportFountain}
            onExportPlainText={handleExportPlainText}
            onExportWithNotes={handleExportWithNotes}
            onExportBible={handleExportProductionBible}
            onCopyClipboard={handleCopyClipboard}
            onPrint={() => window.print()}
          />

          {/* Scene Selector Pill Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {scenes.map((sc, idx) => {
              const scNum = getSceneNumber(sc, idx);
              return (
                <button
                  key={sc.id}
                  onClick={() => setUserSelectedSceneId(sc.id)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    activeSceneId === sc.id
                      ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Scene {scNum}
                </button>
              );
            })}
            <button
              onClick={() => handleAddScene()}
              className="px-2 py-1 rounded text-xs font-mono text-cyan-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-1"
              title={isScreenplayLocked ? 'Add scene with locked alphanumeric numbering (e.g. 1A)' : 'Add new scene'}
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Beat Board View OR Shot List OR Breakdown OR Analytics OR Script Editor */}
      {viewMode === 'board' ? (
        <BeatBoardView
          parentNode={node}
          beats={scenes}
          onOpenBeat={(beatId) => {
            setUserSelectedSceneId(beatId);
            setViewMode('editor');
            selectNode(beatId);
          }}
          beatTypeLabel="Scene"
        />
      ) : viewMode === 'shotlist' ? (
        <ShotListTableView
          scene={currentScene}
          scenes={scenes}
          onSelectScene={setUserSelectedSceneId}
          onOpenReel={(id) => {
            if (id) setActiveShotId(id);
            setIsReelOpen(true);
          }}
        />
      ) : viewMode === 'breakdown' ? (
        <BreakdownSheetView
          scene={currentScene}
          scenes={scenes}
          onSelectScene={setUserSelectedSceneId}
          screenplayNode={node}
        />
      ) : viewMode === 'analytics' ? (
        <ProductionAnalyticsView
          screenplayNode={node}
          nodes={nodes}
          characters={characters}
          breakdownElements={breakdownElements}
          shotsByScene={shotsByScene}
          onSelectScene={(sceneId) => {
            setUserSelectedSceneId(sceneId);
            setViewMode('editor');
          }}
        />
      ) : viewMode === 'stripboard' ? (
        <StripboardView
          screenplayNode={node}
          scenes={scenes}
        />
      ) : viewMode === 'adr' ? (
        <ADRRecordingSheetView
          screenplayNode={node}
          nodes={nodes}
          characters={characters}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
        {/* Left: Script Flow (Courier Prime / Monospace standard format) */}
        <div className="screenplay-print-container flex-1 overflow-y-auto p-8 lg:p-12 border-r border-slate-800/80 bg-slate-950/40">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Screenplay Heading */}
            {!isScene && (
              <div className="text-center pb-8 border-b border-slate-800/60">
                <h2 className="text-2xl font-mono font-bold tracking-widest text-slate-200 uppercase">
                  {node.title}
                </h2>
                {node.properties?.author && (
                  <p className="text-xs font-mono text-slate-400 mt-2">
                    WRITTEN BY {node.properties.author.toUpperCase()}
                  </p>
                )}
              </div>
            )}

            {/* Current Scene Display */}
            {currentScene ? (
              <div className="space-y-6">
                {/* Scene Heading slugline (Editable) */}
                <div className="screenplay-scene-heading group flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/60 transition-all">
                  <div className="flex items-center space-x-2 flex-1 mr-3">
                    <Film className="w-4 h-4 text-rose-400 shrink-0 no-print" />
                    <span className="no-print text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                      SCENE {getSceneNumber(currentScene, scenes.findIndex((s) => s.id === currentScene.id))}
                    </span>
                    <input
                      type="text"
                      value={currentScene.title}
                      onChange={(e) => updateNodeTitle(currentScene.id, e.target.value.toUpperCase())}
                      onKeyDown={handleSceneHeadingKeyDown}
                      placeholder="EXT. NEON ROOFTOP - NIGHT"
                      className="w-full bg-transparent font-mono font-bold text-sm tracking-wide text-white uppercase focus:outline-none placeholder-slate-600"
                    />
                  </div>
                  <div className="no-print flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                    <button
                      onClick={() => handleAddScene(currentScene.id)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 transition-colors flex items-center space-x-1"
                      title={isScreenplayLocked ? 'Insert locked scene after this scene (e.g. 1A)' : 'Insert new scene after this scene'}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Scene</span>
                    </button>
                    <span>[Enter: +Action]</span>
                    <button
                      onClick={() => insertBlock(currentScene.id, 'action', null, '')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Add Action block at top of scene"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {/* Scene Heading Notes Badge */}
                    {(() => {
                      const sceneNotes = notesByNode[currentScene.id] || [];
                      return sceneNotes.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNotesAnchorNodeId(currentScene.id);
                            setIsNotesDrawerOpen(true);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono border flex items-center space-x-1 transition-all ${
                            sceneNotes.some((n) => !n.is_resolved)
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                          title={`Scene heading has ${sceneNotes.length} review note(s)`}
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>{sceneNotes.length}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNotesAnchorNodeId(currentScene.id);
                            setIsNotesDrawerOpen(true);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex items-center space-x-1"
                          title="Add review note to scene heading"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>Note</span>
                        </button>
                      );
                    })()}

                    {/* Scene Audio Spotting Drawer Button */}
                    {(() => {
                      const sceneAudioCues = audioCuesByScene[currentScene.id] || [];
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setAudioSpottingScene(currentScene);
                            setIsAudioSpottingOpen(true);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center space-x-1 transition-all ${
                            sceneAudioCues.length > 0
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border-transparent'
                          }`}
                          title={`Audio Spotting markers for this scene (${sceneAudioCues.length})`}
                        >
                          <Music className="w-3 h-3 text-indigo-400" />
                          <span>Spotting{sceneAudioCues.length > 0 ? ` (${sceneAudioCues.length})` : ''}</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Blocks under this scene */}
                {sceneBlocks.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-mono text-xs space-y-3">
                    <p>Scene is empty. Press Enter on heading or click below to start writing.</p>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => insertBlock(currentScene.id, 'action', null, '')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded text-xs"
                      >
                        + Add Action
                      </button>
                      <button
                        onClick={() =>
                          insertBlock(currentScene.id, 'dialogue', null, '', {
                            character_name: 'ELENA',
                          })
                        }
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded text-xs"
                      >
                        + Add Dialogue
                      </button>
                    </div>
                  </div>
                ) : (
                  sceneBlocks.map((block, idx) => {
                    const isCovered = coveredBlockIds.has(block.id);
                    const characterId = block.properties?.character_id;
                    const character = characterId ? characters[characterId] : null;
                    const characterName =
                      block.properties?.character_name || character?.name || 'CHARACTER';
                    const blockBreakdownElements = getBlockBreakdownElements(block.id);

                    if (block.type === 'action') {
                      const isRevised = Boolean(
                        block.revision_asterisk ||
                        (activeRevisionColor !== 'WHITE' &&
                          (block.revision_color === activeRevisionColor ||
                            block.properties?.revision_color === activeRevisionColor))
                      );

                      return (
                        <div
                          key={block.id}
                          className={`screenplay-action-block group relative p-4 rounded-lg font-mono text-sm leading-relaxed transition-all duration-200 ${
                            isCovered
                              ? 'bg-cyan-950/30 border border-cyan-500/60 shadow-sm shadow-cyan-950 text-cyan-100'
                              : 'text-slate-300 bg-slate-900/20 border border-transparent hover:border-slate-800 hover:bg-slate-900/40'
                          }`}
                        >
                          {/* Right Margin Revision Asterisk */}
                          <div
                            onClick={() => {
                              updateNodeFields(block.id, {
                                revision_asterisk: !isRevised,
                                revision_color: activeRevisionColor,
                              });
                            }}
                            className="absolute right-3 top-3.5 select-none cursor-pointer flex items-center justify-center z-10"
                            title={
                              isRevised
                                ? `Revised in ${revisionConfig.draftName} (Click to toggle)`
                                : `Mark revision in ${revisionConfig.label} draft`
                            }
                          >
                            {isRevised ? (
                              <span
                                className="font-mono text-base font-bold leading-none px-1 rounded hover:scale-125 transition-transform"
                                style={{ color: revisionConfig.hex }}
                              >
                                *
                              </span>
                            ) : (
                              <span className="no-print font-mono text-[10px] opacity-0 group-hover:opacity-30 text-slate-500 hover:text-slate-200">
                                *
                              </span>
                            )}
                            {isRevised && (
                              <span className="screenplay-revision-asterisk hidden print:block">*</span>
                            )}
                          </div>

                          <div className="no-print flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-sans pr-6">
                            <div className="flex items-center space-x-2">
                              <span>Action Block</span>
                              <span className="text-slate-600">•</span>
                              <button
                                onClick={() =>
                                  changeBlockType(block.id, 'dialogue', {
                                    character_name: 'CHARACTER',
                                  })
                                }
                                className="text-slate-500 hover:text-cyan-400 underline decoration-dotted"
                              >
                                Convert to Dialogue
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTagPopover(block.id)}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                                  title="Tag production element (Prop, Costume, VFX, SFX, Location)"
                                >
                                  <Tag className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>Tag Element</span>
                                </button>
                                {activeTagPopoverBlockId === block.id && (
                                  <BreakdownTagPopover
                                    blockId={block.id}
                                    isOpen={true}
                                    onClose={() => setActiveTagPopoverBlockId(null)}
                                    initialName={popoverInitialText}
                                  />
                                )}
                              </div>

                              {activeShot && (
                                <button
                                  onClick={() => handleToggleCoverage(block.id)}
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                    isCovered
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                  title="Toggle coverage with active shot"
                                >
                                  <LinkIcon className="w-2.5 h-2.5" />
                                  <span>
                                    {isCovered
                                      ? `Covered in Shot ${activeShot.shot_number}`
                                      : `Link to Shot ${activeShot.shot_number}`}
                                  </span>
                                </button>
                              )}
                              {/* Marginalia Comment Indicator */}
                              {(() => {
                                const blockNotes = notesByNode[block.id] || [];
                                return blockNotes.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotesAnchorNodeId(block.id);
                                      setIsNotesDrawerOpen(true);
                                    }}
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
                                      blockNotes.some((n) => !n.is_resolved)
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    }`}
                                    title={`View ${blockNotes.length} review note(s) for this block`}
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    <span>{blockNotes.length}</span>
                                    {blockNotes.some((n) => !n.is_resolved) && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotesAnchorNodeId(block.id);
                                      setIsNotesDrawerOpen(true);
                                    }}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Attach review note to this block"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    <span>Note</span>
                                  </button>
                                );
                              })()}

                              <button
                                onClick={() => deleteNode(block.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 p-0.5 transition-opacity"
                                title="Delete block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <textarea
                            ref={(el) => {
                              blockInputRefs.current[block.id] = el;
                            }}
                            value={block.content}
                            onChange={(e) => {
                              const extra = activeRevisionColor !== 'WHITE'
                                ? { revision_asterisk: true, revision_color: activeRevisionColor }
                                : {};
                              updateNodeContent(block.id, e.target.value, extra);
                            }}
                            onKeyDown={(e) => handleActionKeyDown(e, block, idx)}
                            placeholder="Describe action, movement, or setting..."
                            rows={Math.max(2, block.content.split('\n').length)}
                            className="w-full bg-transparent resize-none focus:outline-none text-slate-200 placeholder-slate-600 leading-relaxed font-mono"
                          />

                          {blockBreakdownElements.length > 0 && (
                            <div className="no-print flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60">
                              {blockBreakdownElements.map((el) => (
                                <BreakdownBadge
                                  key={el.id}
                                  element={el}
                                  onRemove={() => untagBlockFromElement(block.id, el.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (block.type === 'dialogue') {
                      const isRevised = Boolean(
                        block.revision_asterisk ||
                        (activeRevisionColor !== 'WHITE' &&
                          (block.revision_color === activeRevisionColor ||
                            block.properties?.revision_color === activeRevisionColor))
                      );

                      return (
                        <div
                          key={block.id}
                          className={`screenplay-dialogue-block group relative p-5 rounded-lg transition-all duration-200 ${
                            isCovered
                              ? 'bg-blue-950/40 border border-cyan-400/60 ring-1 ring-cyan-400/20 shadow-lg shadow-cyan-950/40'
                              : 'bg-slate-900/20 border border-transparent hover:border-slate-800 hover:bg-slate-900/40'
                          }`}
                        >
                          {/* Right Margin Revision Asterisk */}
                          <div
                            onClick={() => {
                              updateNodeFields(block.id, {
                                revision_asterisk: !isRevised,
                                revision_color: activeRevisionColor,
                              });
                            }}
                            className="absolute right-3 top-3.5 select-none cursor-pointer flex items-center justify-center z-10"
                            title={
                              isRevised
                                ? `Revised in ${revisionConfig.draftName} (Click to toggle)`
                                : `Mark revision in ${revisionConfig.label} draft`
                            }
                          >
                            {isRevised ? (
                              <span
                                className="font-mono text-base font-bold leading-none px-1 rounded hover:scale-125 transition-transform"
                                style={{ color: revisionConfig.hex }}
                              >
                                *
                              </span>
                            ) : (
                              <span className="no-print font-mono text-[10px] opacity-0 group-hover:opacity-30 text-slate-500 hover:text-slate-200">
                                *
                              </span>
                            )}
                            {isRevised && (
                              <span className="screenplay-revision-asterisk hidden print:block">*</span>
                            )}
                          </div>

                          {/* Block Header & Action Controls */}
                          <div className="no-print flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-sans pr-6">
                            <div className="flex items-center space-x-2">
                              <span>Dialogue Block</span>
                              <span className="text-slate-600">•</span>
                              <button
                                onClick={() => changeBlockType(block.id, 'action')}
                                className="text-slate-500 hover:text-cyan-400 underline decoration-dotted"
                              >
                                Convert to Action
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTagPopover(block.id)}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                                  title="Tag production element (Prop, Costume, VFX, SFX, Location)"
                                >
                                  <Tag className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>Tag Element</span>
                                </button>
                                {activeTagPopoverBlockId === block.id && (
                                  <BreakdownTagPopover
                                    blockId={block.id}
                                    isOpen={true}
                                    onClose={() => setActiveTagPopoverBlockId(null)}
                                    initialName={popoverInitialText}
                                  />
                                )}
                              </div>

                              {activeShot && (
                                <button
                                  onClick={() => handleToggleCoverage(block.id)}
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                    isCovered
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                                  }`}
                                  title="Toggle coverage with active shot"
                                >
                                  <LinkIcon className="w-2.5 h-2.5" />
                                  <span>
                                    {isCovered
                                      ? `Covered in Shot ${activeShot.shot_number}`
                                      : `Link to Shot ${activeShot.shot_number}`}
                                  </span>
                                </button>
                              )}
                              {/* Marginalia Comment Indicator */}
                              {(() => {
                                const blockNotes = notesByNode[block.id] || [];
                                return blockNotes.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotesAnchorNodeId(block.id);
                                      setIsNotesDrawerOpen(true);
                                    }}
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
                                      blockNotes.some((n) => !n.is_resolved)
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    }`}
                                    title={`View ${blockNotes.length} review note(s) for this block`}
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    <span>{blockNotes.length}</span>
                                    {blockNotes.some((n) => !n.is_resolved) && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNotesAnchorNodeId(block.id);
                                      setIsNotesDrawerOpen(true);
                                    }}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Attach review note to this block"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5" />
                                    <span>Note</span>
                                  </button>
                                );
                              })()}

                              {/* Dialogue Block ADR Tag / Cue Badge */}
                              {(() => {
                                const blockCues = adrCues[block.id] || [];
                                return blockCues.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveADRBlock(block)}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all shadow-sm"
                                    title={`ADR Cue: ${blockCues[0].cue_number} (${blockCues[0].status})`}
                                  >
                                    <Mic className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{blockCues[0].cue_number}</span>
                                    {blockCues.length > 1 && (
                                      <span className="text-[9px] text-amber-400/80">+{blockCues.length - 1}</span>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setActiveADRBlock(block)}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 hover:text-amber-400 hover:bg-slate-800/80 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Tag dialogue block for ADR re-recording"
                                  >
                                    <Mic className="w-2.5 h-2.5" />
                                    <span>ADR</span>
                                  </button>
                                );
                              })()}

                              <button
                                onClick={() => deleteNode(block.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 p-0.5 transition-opacity"
                                title="Delete block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Character Name with Fuzzy Autocomplete Dropdown */}
                          <div className="screenplay-character-cue text-center">
                            <CharacterAutocompleteInput
                              blockId={block.id}
                              characterName={characterName}
                              characterId={characterId}
                              onSelectCharacter={(char) => {
                                updateNodeProperties(block.id, {
                                  character_name: char.name,
                                  character_id: char.id || undefined,
                                });
                              }}
                              onEnterToDialogue={() => focusBlock(block.id)}
                              onTabToParenthetical={() => {
                                const currentParen = block.properties?.parenthetical || '';
                                updateNodeProperties(block.id, {
                                  parenthetical: currentParen ? '' : 'beat',
                                });
                                focusBlock(`${block.id}-paren`);
                              }}
                              inputRef={(el) => {
                                blockInputRefs.current[`${block.id}-char`] = el;
                              }}
                            />

                            {/* Parenthetical (Optional, Tab to toggle) */}
                            {block.properties?.parenthetical !== undefined &&
                              block.properties?.parenthetical !== '' && (
                                <div className="screenplay-parenthetical mt-1 text-center">
                                  <span className="text-xs font-mono text-slate-400 italic">
                                    (
                                    <input
                                      ref={(el) => {
                                        blockInputRefs.current[`${block.id}-paren`] = el;
                                      }}
                                      type="text"
                                      value={block.properties.parenthetical}
                                      onChange={(e) =>
                                        updateNodeProperties(block.id, {
                                          parenthetical: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          focusBlock(block.id);
                                        }
                                      }}
                                      placeholder="delivery"
                                      className="bg-transparent text-center focus:outline-none border-b border-dashed border-slate-700 text-xs text-slate-400 italic font-mono w-28"
                                    />
                                    )
                                  </span>
                                </div>
                              )}
                          </div>

                          {/* Dialogue text */}
                          <div className="screenplay-dialogue-text max-w-md mx-auto mt-2 text-center">
                            <textarea
                              ref={(el) => {
                                blockInputRefs.current[block.id] = el;
                              }}
                              value={block.content}
                              onChange={(e) => {
                                const extra = activeRevisionColor !== 'WHITE'
                                  ? { revision_asterisk: true, revision_color: activeRevisionColor }
                                  : {};
                                updateNodeContent(block.id, e.target.value, extra);
                              }}
                              onKeyDown={(e) => handleDialogueKeyDown(e, block, idx)}
                              placeholder="Spoken dialogue line..."
                              rows={Math.max(2, block.content.split('\n').length)}
                              className="w-full bg-transparent resize-none font-mono text-sm text-center leading-relaxed text-slate-200 focus:outline-none placeholder-slate-600"
                            />
                          </div>

                          {blockBreakdownElements.length > 0 && (
                            <div className="no-print flex flex-wrap justify-center gap-1.5 mt-3 pt-2 border-t border-slate-800/60">
                              {blockBreakdownElements.map((el) => (
                                <BreakdownBadge
                                  key={el.id}
                                  element={el}
                                  onRemove={() => untagBlockFromElement(block.id, el.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={block.id}
                        className="p-3 text-xs font-mono text-slate-400 bg-slate-900/40 rounded border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="uppercase text-slate-500 mr-2">[{block.type}]</span>
                          {block.content || block.title}
                        </div>
                        <button
                          onClick={() => deleteNode(block.id)}
                          className="no-print text-slate-600 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                Select or create a scene to view script flow.
              </div>
            )}
          </div>
        </div>

        {/* Right: Synchronized Shot List & Storyboard Panel */}
        <div className="no-print w-96 flex flex-col bg-slate-950/80 shrink-0 border-l border-slate-800/80">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Production Coverage
              </h3>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsReelOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs font-medium transition-all shadow-sm"
                title="View full scene storyboard reel gallery"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reel</span>
              </button>
              <button
                onClick={() => setIsAddingShot(!isAddingShot)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Shot</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/40 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Decoupled coverage layer</span>
            </span>
            <span className="font-mono text-cyan-400">{shots.length} shots</span>
          </div>

          {/* New Shot Creator Form */}
          {isAddingShot && (
            <form
              onSubmit={handleCreateShotSubmit}
              className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3 text-xs animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <span>Create Scene Shot</span>
                <button
                  type="button"
                  onClick={() => setIsAddingShot(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Shot #</label>
                  <input
                    type="text"
                    value={newShotNumber}
                    onChange={(e) => setNewShotNumber(e.target.value.toUpperCase())}
                    placeholder="1B"
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Type</label>
                  <select
                    value={newShotType}
                    onChange={(e) => setNewShotType(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="WIDE">WIDE</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="CLOSE-UP">CLOSE-UP</option>
                    <option value="EXTREME CLOSE-UP">EXTREME CLOSE-UP</option>
                    <option value="OVER THE SHOULDER">OVER THE SHOULDER</option>
                    <option value="POV">POV</option>
                    <option value="TRACKING">TRACKING</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Lens</label>
                  <input
                    type="text"
                    value={newShotLens}
                    onChange={(e) => setNewShotLens(e.target.value)}
                    placeholder="50mm Anamorphic"
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Duration (s)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newShotDuration}
                    onChange={(e) => setNewShotDuration(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase">Storyboard Frame Image</label>
                <div
                  onClick={() => newShotFileInputRef.current?.click()}
                  className="mt-1 border border-dashed border-slate-700 hover:border-cyan-500 rounded p-2 text-center cursor-pointer bg-slate-950/60 transition-colors"
                >
                  {newShotFile ? (
                    <div className="flex items-center justify-center space-x-1.5 text-xs text-cyan-300 font-mono">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[200px]">{newShotFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 font-mono">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Upload Frame Image (or enter URL below)</span>
                    </div>
                  )}
                  <input
                    ref={newShotFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewShotFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                <input
                  type="url"
                  value={newShotUrl}
                  onChange={(e) => setNewShotUrl(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full mt-1.5 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingShot(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newShotNumber.trim()}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium"
                >
                  Add Shot
                </button>
              </div>
            </form>
          )}

          {/* Shot Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {shots.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-lg">
                <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No shots scheduled for this scene</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click &ldquo;Shot&rdquo; to add a camera coverage setup.
                </p>
              </div>
            ) : (
              shots.map((shot) => {
                const isSelected = activeShot?.id === shot.id;
                const coveredCount = shot.blocks?.length || 0;

                return (
                  <div
                    key={shot.id}
                    onClick={() => setActiveShotId(shot.id)}
                    className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/20'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    {/* Shot Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          SHOT {shot.shot_number}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                          {shot.shot_type || 'STANDARD'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{shot.duration_seconds}s</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTakeLoggerShot(shot);
                          }}
                          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-medium transition-colors"
                          title="Open Production Take & Slate Logger"
                        >
                          <Clapperboard className="w-3 h-3 text-amber-400" />
                          <span>Takes</span>
                        </button>
                      </div>
                    </div>

                    {/* Storyboard Frame Image with Live Upload */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        shotSidebarFileInputRefs.current[shot.id]?.click();
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0] && currentScene) {
                          setIsUploadingSidebarShotId(shot.id);
                          try {
                            await uploadShotStoryboard(shot.id, e.dataTransfer.files[0], currentScene.id);
                          } finally {
                            setIsUploadingSidebarShotId(null);
                          }
                        }
                      }}
                      className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 mb-2.5 bg-slate-950 group-hover:border-cyan-500/60 transition-colors cursor-pointer flex items-center justify-center"
                      title="Click or drag image to upload storyboard frame"
                    >
                      {shot.storyboard_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.storyboard_url}
                            alt={`Shot ${shot.shot_number}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-1.5 left-2 text-[10px] font-mono text-white/90">
                            {shot.lens || 'Prime'}
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white space-x-1">
                            <Upload className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Change Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-cyan-400 transition-colors">
                          {isUploadingSidebarShotId === shot.id ? (
                            <span className="text-[10px] text-cyan-400 font-mono animate-pulse">Uploading...</span>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 mb-1 opacity-60" />
                              <span className="text-[9px] font-mono uppercase">Upload Frame</span>
                            </>
                          )}
                        </div>
                      )}

                      <input
                        ref={(el) => {
                          shotSidebarFileInputRefs.current[shot.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0] && currentScene) {
                            setIsUploadingSidebarShotId(shot.id);
                            try {
                              await uploadShotStoryboard(shot.id, e.target.files[0], currentScene.id);
                            } finally {
                              setIsUploadingSidebarShotId(null);
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate">{shot.lens || 'Standard Lens'}</span>
                      <span className="text-cyan-400 font-medium">
                        {coveredCount} Block{coveredCount === 1 ? '' : 's'} Covered
                      </span>
                    </div>

                    {/* Covered Blocks Pills */}
                    {isSelected && shot.blocks && shot.blocks.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[10px] font-mono uppercase text-slate-500">Covered script blocks:</div>
                        <div className="space-y-1">
                          {shot.blocks.map((b) => (
                            <div
                              key={b.id}
                              className="text-[11px] font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded truncate border border-slate-800"
                            >
                              <span className="text-cyan-400 uppercase mr-1">[{b.type}]</span>
                              {b.content.slice(0, 32)}...
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {/* Storyboard Reel Modal */}
      <StoryboardReelModal
        isOpen={isReelOpen}
        onClose={() => setIsReelOpen(false)}
        scene={currentScene}
        shots={shots}
        activeShotId={activeShot?.id || null}
        onSelectShot={(id) => {
          setActiveShotId(id);
          setIsReelOpen(false);
        }}
      />

      {/* Actor Sides Generator Modal */}
      <CharacterSidesModal
        isOpen={isSidesModalOpen}
        onClose={() => setIsSidesModalOpen(false)}
        screenplayNode={node}
        scenes={scenes}
      />

      {/* Script Import Modal */}
      <ScriptImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        screenplayNode={node}
        onImportComplete={(firstSceneId) => {
          setUserSelectedSceneId(firstSceneId);
          setViewMode('editor');
        }}
      />

      {/* Version History & Diff Modal */}
      <VersionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        screenplayNode={node}
        currentNodes={screenplaySubtreeNodes}
      />

      {/* Anchored Script Marginalia Drawer */}
      <ScriptNotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        activeNode={notesAnchorNodeId ? nodes[notesAnchorNodeId] || null : currentScene}
        allSceneNodes={
          currentScene
            ? [
                currentScene,
                ...(childrenMap[currentScene.id] || [])
                  .map((id) => nodes[id])
                  .filter((n): n is WorkspaceNode => Boolean(n)),
              ]
            : []
        }
        onSelectNode={(nodeId) => setNotesAnchorNodeId(nodeId)}
      />

      {/* Production Take & Slate Logger Modal */}
      <TakeLoggerModal
        isOpen={Boolean(takeLoggerShot)}
        onClose={() => setTakeLoggerShot(null)}
        shot={takeLoggerShot}
        scene={currentScene}
      />

      {/* ADR Cue Creation / Management Modal */}
      {activeADRBlock && (
        <ADRCueModal
          isOpen={Boolean(activeADRBlock)}
          onClose={() => setActiveADRBlock(null)}
          dialogueBlock={activeADRBlock}
          character={
            activeADRBlock.properties?.character_id
              ? characters[activeADRBlock.properties.character_id] || null
              : null
          }
          characterName={
            activeADRBlock.properties?.character_name ||
            (activeADRBlock.properties?.character_id
              ? characters[activeADRBlock.properties.character_id]?.name || ''
              : '')
          }
          existingCues={activeADRBlock ? adrCues[activeADRBlock.id] || [] : []}
        />
      )}

      {/* Audio Spotting Session Drawer */}
      <AudioSpottingDrawer
        isOpen={isAudioSpottingOpen}
        onClose={() => setIsAudioSpottingOpen(false)}
        scene={audioSpottingScene || currentScene}
        scenes={scenes}
        onSelectScene={(sceneId) => {
          setUserSelectedSceneId(sceneId);
          const found = scenes.find((s) => s.id === sceneId);
          if (found) setAudioSpottingScene(found);
        }}
      />
    </div>
  );
};
