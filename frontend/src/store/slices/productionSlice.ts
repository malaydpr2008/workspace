import { StateCreator } from 'zustand';
import {
  BreakdownElement,
  RevisionColor,
  ADRCue,
  ProductionMilestone,
} from '@/types/workspace';
import {
  fetchShots,
  createShot,
  updateShot,
  deleteShot,
  createShotCoverage,
  createCharacter,
  fetchSubtree,
  fetchBreakdownElements,
  createBreakdownElement,
  updateBreakdownElement,
  deleteBreakdownElement,
  uploadShotImage,
  fetchSnapshots,
  createSnapshot,
  restoreSnapshot,
  fetchSchedules,
  createSchedule,
  fetchShootingDays,
  createShootingDay,
  updateShootingDay,
  deleteShootingDay,
  fetchStripboardItems,
  createStripboardItem,
  updateStripboardItem,
  deleteStripboardItem,
  reorderStripboardItems,
  fetchTakesForShot,
  createProductionTake,
  updateProductionTake,
  toggleCircleTake,
  deleteProductionTake,
  fetchADRCues,
  createADRCue,
  updateADRCueStatus,
  deleteADRCue,
  fetchAudioSpottingCues,
  createAudioSpottingCue,
  deleteAudioSpottingCue,
  fetchMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  initializeDefaultTimeline,
  fetchCoverageReports,
  generateCoverageReport,
} from '@/lib/api';
import { WorkspaceState, ProductionSlice } from '../types';

export const createProductionSlice: StateCreator<
  WorkspaceState,
  [],
  [],
  ProductionSlice
> = (set, get) => ({
  characters: {},
  shotsByScene: {},
  breakdownElements: {},
  snapshots: [],
  schedules: [],
  activeScheduleId: null,
  shootingDays: [],
  stripboardItems: [],
  takesByShot: {},
  adrCues: {},
  audioCuesByScene: {},
  milestones: [],
  coverageReports: [],

  createWorkspaceCharacter: async (name: string) => {
    const { currentWorkspace, characters } = get();
    if (!currentWorkspace) return null;

    try {
      const created = await createCharacter({
        workspace: currentWorkspace.id,
        name: name.trim(),
        avatar: '',
        metadata: {},
      });

      set({
        characters: {
          ...characters,
          [created.id]: created,
        },
      });

      return created;
    } catch (err) {
      console.error('Failed to create character', err);
      return null;
    }
  },

  loadSceneShots: async (sceneId: string) => {
    try {
      const shots = await fetchShots(sceneId);
      set((state) => ({
        shotsByScene: {
          ...state.shotsByScene,
          [sceneId]: shots,
        },
      }));
    } catch (err: unknown) {
      console.error('Failed to load shots for scene', sceneId, err);
    }
  },

  createSceneShot: async (sceneId, shotData) => {
    try {
      const shot = await createShot({
        scene: sceneId,
        ...shotData,
      });

      await get().loadSceneShots(sceneId);
      return shot;
    } catch (err) {
      console.error('Failed to create shot', err);
      return null;
    }
  },

  updateSceneShot: async (shotId, data, sceneId) => {
    try {
      const updated = await updateShot(shotId, data);
      await get().loadSceneShots(sceneId);
      return updated;
    } catch (err) {
      console.error('Failed to update shot', err);
      return null;
    }
  },

  removeShot: async (shotId, sceneId) => {
    try {
      await deleteShot(shotId);
      await get().loadSceneShots(sceneId);
    } catch (err) {
      console.error('Failed to delete shot', err);
    }
  },

  attachBlockToShot: async (shotId, blockId, sceneId) => {
    try {
      await createShotCoverage(shotId, blockId);
      await get().loadSceneShots(sceneId);
    } catch (err) {
      console.error('Failed to attach block to shot', err);
    }
  },

  uploadShotStoryboard: async (shotId: string, file: File, sceneId: string) => {
    try {
      const updatedShot = await uploadShotImage(shotId, file);
      await get().loadSceneShots(sceneId);
      return updatedShot;
    } catch (err) {
      console.error('Failed to upload shot storyboard', err);
      return null;
    }
  },

  loadBreakdownElements: async (workspaceId?: string) => {
    const wsId = workspaceId || get().currentWorkspace?.id;
    if (!wsId) return [];
    try {
      const elements = await fetchBreakdownElements(wsId);
      const elementsMap: Record<string, BreakdownElement> = {};
      elements.forEach((el) => {
        elementsMap[el.id] = el;
      });
      set({ breakdownElements: elementsMap });
      return elements;
    } catch (err) {
      console.error('Failed to load breakdown elements', err);
      return [];
    }
  },

  addBreakdownElement: async (data: Partial<BreakdownElement>) => {
    const wsId = data.workspace || get().currentWorkspace?.id;
    if (!wsId) return null;
    try {
      const created = await createBreakdownElement({ ...data, workspace: wsId });
      set({
        breakdownElements: {
          ...get().breakdownElements,
          [created.id]: created,
        },
      });
      return created;
    } catch (err) {
      console.error('Failed to add breakdown element', err);
      return null;
    }
  },

  updateBreakdownElementItem: async (id: string, data: Partial<BreakdownElement>) => {
    try {
      const updated = await updateBreakdownElement(id, data);
      set({
        breakdownElements: {
          ...get().breakdownElements,
          [id]: updated,
        },
      });
      return updated;
    } catch (err) {
      console.error('Failed to update breakdown element', err);
      return null;
    }
  },

  removeBreakdownElement: async (id: string) => {
    try {
      await deleteBreakdownElement(id);
      const nextMap = { ...get().breakdownElements };
      delete nextMap[id];
      set({ breakdownElements: nextMap });
    } catch (err) {
      console.error('Failed to delete breakdown element', err);
    }
  },

  tagBlockWithElement: async (blockId: string, elementId: string) => {
    const element = get().breakdownElements[elementId];
    if (!element) return;
    const currentBlockIds = element.block_ids || [];
    if (currentBlockIds.includes(blockId)) return;
    const newBlockIds = [...currentBlockIds, blockId];
    await get().updateBreakdownElementItem(elementId, { block_ids: newBlockIds });
  },

  untagBlockFromElement: async (blockId: string, elementId: string) => {
    const element = get().breakdownElements[elementId];
    if (!element) return;
    const currentBlockIds = element.block_ids || [];
    const newBlockIds = currentBlockIds.filter((id) => id !== blockId);
    await get().updateBreakdownElementItem(elementId, { block_ids: newBlockIds });
  },

  loadSnapshots: async (documentId: string) => {
    try {
      const list = await fetchSnapshots(documentId);
      set({ snapshots: list });
      return list;
    } catch (err) {
      console.error('Failed to load snapshots', err);
      return [];
    }
  },

  saveDraftSnapshot: async (
    documentId: string,
    label: string,
    revisionColor: RevisionColor
  ) => {
    try {
      const subtreeNodes = await fetchSubtree(documentId);
      const snapshot = await createSnapshot({
        document_node: documentId,
        label,
        revision_color: revisionColor,
        snapshot_data: { nodes: subtreeNodes },
      });
      set((state) => ({
        snapshots: [snapshot, ...state.snapshots],
      }));
      return snapshot;
    } catch (err) {
      console.error('Failed to create snapshot', err);
      return null;
    }
  },

  restoreDraftSnapshot: async (snapshotId: string, documentId: string) => {
    try {
      await restoreSnapshot(snapshotId);
      await get().loadSubtree(documentId);
      await get().loadSnapshots(documentId);
      return true;
    } catch (err) {
      console.error('Failed to restore snapshot', err);
      return false;
    }
  },

  loadSchedules: async (screenplayId: string) => {
    try {
      const list = await fetchSchedules(screenplayId);
      set({ schedules: list });
      if (list.length > 0 && !get().activeScheduleId) {
        await get().setActiveSchedule(list[0].id);
      }
      return list;
    } catch (err) {
      console.error('Failed to load schedules', err);
      return [];
    }
  },

  setActiveSchedule: async (scheduleId: string | null) => {
    set({ activeScheduleId: scheduleId });
    if (!scheduleId) {
      set({ shootingDays: [], stripboardItems: [] });
      return;
    }
    try {
      const [days, strips] = await Promise.all([
        fetchShootingDays(scheduleId),
        fetchStripboardItems(scheduleId),
      ]);
      set({
        shootingDays: days.sort((a, b) => a.order - b.order || a.day_number - b.day_number),
        stripboardItems: strips.sort((a, b) => a.order - b.order),
      });
    } catch (err) {
      console.error('Failed to load schedule details', err);
    }
  },

  createScheduleItem: async (screenplayId: string, title: string) => {
    try {
      const created = await createSchedule({
        screenplay: screenplayId,
        title,
      });
      set((state) => ({ schedules: [created, ...state.schedules] }));
      await get().setActiveSchedule(created.id);
      return created;
    } catch (err) {
      console.error('Failed to create schedule', err);
      return null;
    }
  },

  createShootingDayItem: async (data) => {
    try {
      const created = await createShootingDay(data);
      set((state) => ({
        shootingDays: [...state.shootingDays, created].sort(
          (a, b) => a.order - b.order || a.day_number - b.day_number
        ),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create shooting day', err);
      return null;
    }
  },

  updateShootingDayItem: async (id, data) => {
    try {
      const updated = await updateShootingDay(id, data);
      set((state) => ({
        shootingDays: state.shootingDays.map((d) => (d.id === id ? updated : d)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update shooting day', err);
      return null;
    }
  },

  deleteShootingDayItem: async (id) => {
    try {
      await deleteShootingDay(id);
      set((state) => ({
        shootingDays: state.shootingDays.filter((d) => d.id !== id),
        stripboardItems: state.stripboardItems.map((s) =>
          s.shooting_day === id ? { ...s, shooting_day: null } : s
        ),
      }));
    } catch (err) {
      console.error('Failed to delete shooting day', err);
    }
  },

  createStripItem: async (data) => {
    try {
      const created = await createStripboardItem(data);
      set((state) => ({
        stripboardItems: [...state.stripboardItems, created].sort((a, b) => a.order - b.order),
      }));
      return created;
    } catch (err) {
      console.error('Failed to create strip item', err);
      return null;
    }
  },

  updateStripItem: async (id, data) => {
    try {
      const updated = await updateStripboardItem(id, data);
      set((state) => ({
        stripboardItems: state.stripboardItems.map((s) => (s.id === id ? updated : s)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update strip item', err);
      return null;
    }
  },

  deleteStripItem: async (id) => {
    try {
      await deleteStripboardItem(id);
      set((state) => ({
        stripboardItems: state.stripboardItems.filter((s) => s.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete strip item', err);
    }
  },

  reorderStrips: async (items) => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    set((state) => ({
      stripboardItems: state.stripboardItems
        .map((s) => {
          const patch = itemMap.get(s.id);
          if (patch) {
            return {
              ...s,
              order: patch.order,
              shooting_day:
                patch.shooting_day !== undefined ? patch.shooting_day : s.shooting_day,
            };
          }
          return s;
        })
        .sort((a, b) => a.order - b.order),
    }));

    try {
      await reorderStripboardItems(items);
    } catch (err) {
      console.error('Failed to persist strip reordering', err);
    }
  },

  populateStripsFromScenes: async (scheduleId: string, sceneIds: string[]) => {
    try {
      const currentStrips = get().stripboardItems;
      const existingSceneIds = new Set(
        currentStrips.map((s) => s.scene).filter(Boolean)
      );

      let currentOrder = currentStrips.length;
      const toCreate = sceneIds.filter((id) => !existingSceneIds.has(id));

      for (const sceneId of toCreate) {
        currentOrder++;
        await createStripboardItem({
          schedule: scheduleId,
          scene: sceneId,
          shooting_day: null,
          is_banner: false,
          order: currentOrder,
        });
      }

      const refreshed = await fetchStripboardItems(scheduleId);
      set({ stripboardItems: refreshed.sort((a, b) => a.order - b.order) });
    } catch (err) {
      console.error('Failed to populate strips from scenes', err);
    }
  },

  loadTakesForShot: async (shotId: string) => {
    try {
      const list = await fetchTakesForShot(shotId);
      set((state) => ({
        takesByShot: {
          ...state.takesByShot,
          [shotId]: list.sort((a, b) => a.take_number - b.take_number),
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load takes for shot', shotId, err);
      return [];
    }
  },

  createProductionTakeItem: async (data) => {
    try {
      const created = await createProductionTake(data);
      const shotId = data.shot;
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: [...current, created].sort((a, b) => a.take_number - b.take_number),
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create production take', err);
      return null;
    }
  },

  updateProductionTakeItem: async (takeId: string, data, shotId: string) => {
    try {
      const updated = await updateProductionTake(takeId, data);
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: current.map((t) => (t.id === takeId ? updated : t)),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to update production take', err);
      return null;
    }
  },

  toggleCircleTakeItem: async (takeId: string, shotId: string) => {
    try {
      const updated = await toggleCircleTake(takeId);
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: current.map((t) =>
              t.id === takeId ? { ...t, is_circle_take: updated.is_circle_take } : t
            ),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to toggle circle take', err);
      return null;
    }
  },

  deleteProductionTakeItem: async (takeId: string, shotId: string) => {
    try {
      await deleteProductionTake(takeId);
      set((state) => {
        const current = state.takesByShot[shotId] || [];
        return {
          takesByShot: {
            ...state.takesByShot,
            [shotId]: current.filter((t) => t.id !== takeId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete production take', err);
    }
  },

  loadADRCues: async (workspaceId?: string) => {
    try {
      const list = await fetchADRCues({ workspace: workspaceId });
      const grouped: Record<string, ADRCue[]> = {};
      list.forEach((c) => {
        const nid = c.dialogue_node;
        if (!grouped[nid]) grouped[nid] = [];
        grouped[nid].push(c);
      });
      set((state) => ({
        adrCues: {
          ...state.adrCues,
          ...grouped,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load ADR cues', err);
      return [];
    }
  },

  createADRCueItem: async (data) => {
    try {
      const created = await createADRCue(data);
      const nid = data.dialogue_node;
      set((state) => {
        const current = state.adrCues[nid] || [];
        return {
          adrCues: {
            ...state.adrCues,
            [nid]: [...current, created],
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create ADR cue', err);
      return null;
    }
  },

  updateADRCueStatusItem: async (cueId: string, status: string, dialogueNodeId: string) => {
    try {
      const updated = await updateADRCueStatus(cueId, status);
      set((state) => {
        const current = state.adrCues[dialogueNodeId] || [];
        return {
          adrCues: {
            ...state.adrCues,
            [dialogueNodeId]: current.map((c) =>
              c.id === cueId ? { ...c, status: updated.status } : c
            ),
          },
        };
      });
      return updated;
    } catch (err) {
      console.error('Failed to update ADR cue status', err);
      return null;
    }
  },

  deleteADRCueItem: async (cueId: string, dialogueNodeId: string) => {
    try {
      await deleteADRCue(cueId);
      set((state) => {
        const current = state.adrCues[dialogueNodeId] || [];
        return {
          adrCues: {
            ...state.adrCues,
            [dialogueNodeId]: current.filter((c) => c.id !== cueId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete ADR cue', err);
    }
  },

  loadAudioCuesForScene: async (sceneId: string) => {
    try {
      const list = await fetchAudioSpottingCues({ scene: sceneId });
      set((state) => ({
        audioCuesByScene: {
          ...state.audioCuesByScene,
          [sceneId]: list,
        },
      }));
      return list;
    } catch (err) {
      console.error('Failed to load audio cues for scene', sceneId, err);
      return [];
    }
  },

  createAudioSpottingCueItem: async (data) => {
    try {
      const created = await createAudioSpottingCue(data);
      const sid = data.scene;
      set((state) => {
        const current = state.audioCuesByScene[sid] || [];
        return {
          audioCuesByScene: {
            ...state.audioCuesByScene,
            [sid]: [...current, created],
          },
        };
      });
      return created;
    } catch (err) {
      console.error('Failed to create audio spotting cue', err);
      return null;
    }
  },

  deleteAudioSpottingCueItem: async (cueId: string, sceneId: string) => {
    try {
      await deleteAudioSpottingCue(cueId);
      set((state) => {
        const current = state.audioCuesByScene[sceneId] || [];
        return {
          audioCuesByScene: {
            ...state.audioCuesByScene,
            [sceneId]: current.filter((c) => c.id !== cueId),
          },
        };
      });
    } catch (err) {
      console.error('Failed to delete audio spotting cue', err);
    }
  },

  loadMilestones: async (screenplayId: string, workspaceId?: string) => {
    try {
      const milestones = await fetchMilestones({ screenplay: screenplayId, workspace: workspaceId });
      set({ milestones });
      return milestones;
    } catch (err) {
      console.error('Failed to load milestones', err);
      return [];
    }
  },

  createMilestoneItem: async (data: Partial<ProductionMilestone>) => {
    try {
      const created = await createMilestone(data);
      set((state) => ({
        milestones: [...state.milestones, created],
      }));
      return created;
    } catch (err) {
      console.error('Failed to create milestone', err);
      return null;
    }
  },

  updateMilestoneItem: async (id: string, data: Partial<ProductionMilestone>) => {
    try {
      const updated = await updateMilestone(id, data);
      set((state) => ({
        milestones: state.milestones.map((m) => (m.id === id ? updated : m)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update milestone', err);
      return null;
    }
  },

  deleteMilestoneItem: async (id: string) => {
    try {
      await deleteMilestone(id);
      set((state) => ({
        milestones: state.milestones.filter((m) => m.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete milestone', err);
    }
  },

  initDefaultTimeline: async (screenplayId: string, workspaceId?: string) => {
    try {
      const milestones = await initializeDefaultTimeline({ screenplay: screenplayId, workspace: workspaceId });
      set({ milestones });
      return milestones;
    } catch (err) {
      console.error('Failed to initialize default timeline', err);
      return [];
    }
  },

  loadCoverageReports: async (screenplayId, workspaceId) => {
    try {
      const reports = await fetchCoverageReports(screenplayId, workspaceId);
      set({ coverageReports: reports });
      return reports;
    } catch (err) {
      console.error('Failed to load coverage reports', err);
      return [];
    }
  },

  generateCoverageReportItem: async (screenplayId, workspaceId) => {
    try {
      const report = await generateCoverageReport(screenplayId, workspaceId);
      set((state) => ({
        coverageReports: [report, ...state.coverageReports],
      }));
      return report;
    } catch (err) {
      console.error('Failed to generate coverage report', err);
      return null;
    }
  },
});
