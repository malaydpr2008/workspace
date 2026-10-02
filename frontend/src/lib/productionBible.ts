import JSZip from 'jszip';
import { WorkspaceNode, Character, Shot, BreakdownElement } from '@/types/workspace';
import { compileScreenplayToFountain } from '@/lib/compiler';
import { calculateScreenplayAnalytics, ScreenplayAnalytics } from '@/lib/analytics';
import { getSceneNumber } from '@/lib/revision';

function escapeCsv(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Compiles a plain text formatted screenplay from nodes
 */
function compileScreenplayToPlainText(
  rootNode: WorkspaceNode,
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]>,
  characters: Record<string, Character>
): string {
  const lines: string[] = [];
  const title = (rootNode.title || 'UNTITLED SCREENPLAY').toUpperCase();
  const author = (rootNode.properties?.author || 'Antigravity Studio').toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  lines.push('================================================================================');
  lines.push(`                        ${title}`);
  lines.push('================================================================================');
  lines.push(`Written by: ${author}`);
  lines.push(`Draft Date: ${dateStr}`);
  lines.push(`Revision:   ${rootNode.revision_color || 'WHITE'}`);
  lines.push('================================================================================');
  lines.push('');

  const isScene = rootNode.type === 'scene';
  const sceneIds = isScene ? [rootNode.id] : childrenMap[rootNode.id] || [];

  sceneIds.forEach((sceneId, idx) => {
    const sceneNode = nodes[sceneId];
    if (!sceneNode || sceneNode.type !== 'scene') return;

    const scNum = getSceneNumber(sceneNode, idx);
    const heading = (sceneNode.title || 'INT. SCENE - DAY').toUpperCase().trim();

    lines.push('');
    lines.push(`SCENE ${scNum} - ${heading}`);
    lines.push('--------------------------------------------------------------------------------');
    lines.push('');

    const blockIds = childrenMap[sceneNode.id] || [];
    blockIds.forEach((bid) => {
      const block = nodes[bid];
      if (!block) return;

      if (block.type === 'action') {
        if (block.content.trim()) {
          lines.push(block.content.trim());
          lines.push('');
        }
      } else if (block.type === 'dialogue') {
        const charId = block.properties?.character_id;
        const charName = (
          block.properties?.character_name ||
          (charId ? characters[charId]?.name : null) ||
          'CHARACTER'
        ).toUpperCase().trim();

        lines.push(`                    ${charName}`);
        if (block.properties?.parenthetical?.trim()) {
          lines.push(`               (${block.properties.parenthetical.trim()})`);
        }
        if (block.content.trim()) {
          lines.push(`          ${block.content.trim()}`);
        }
        lines.push('');
      }
    });
  });

  return lines.join('\n');
}

/**
 * Compiles individual actor sides text for a character
 */
function compileCharacterSides(
  characterName: string,
  screenplayTitle: string,
  matchingScenes: { scene: WorkspaceNode; sceneNumber: string }[],
  childrenMap: Record<string, string[]>,
  nodes: Record<string, WorkspaceNode>,
  characters: Record<string, Character>
): string {
  const lines: string[] = [];
  const charUpper = characterName.trim().toUpperCase();

  lines.push(`ACTOR SIDES: ${charUpper}`);
  lines.push(`PROJECT: ${(screenplayTitle || 'UNTITLED').toUpperCase()}`);
  lines.push(
    `DATE: ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`
  );
  lines.push(`TOTAL SCENES: ${matchingScenes.length}`);
  lines.push('================================================================================');
  lines.push('');

  matchingScenes.forEach(({ scene, sceneNumber }) => {
    const heading = (scene.title || `SCENE ${sceneNumber}`).toUpperCase().trim();
    lines.push('--------------------------------------------------------------------------------');
    lines.push(`SCENE ${sceneNumber}: ${heading}`);
    lines.push('--------------------------------------------------------------------------------');
    lines.push('');

    const blockIds = childrenMap[scene.id] || [];
    blockIds.forEach((bid) => {
      const block = nodes[bid];
      if (!block) return;

      if (block.type === 'action') {
        if (block.content.trim()) {
          lines.push(block.content.trim());
          lines.push('');
        }
      } else if (block.type === 'dialogue') {
        const bCharId = block.properties?.character_id;
        const bCharName = (
          block.properties?.character_name ||
          (bCharId ? characters[bCharId]?.name : null) ||
          'CHARACTER'
        )
          .toUpperCase()
          .trim();

        const isActorLine = bCharName === charUpper;

        if (isActorLine) {
          lines.push(`**${bCharName}** (YOUR LINE)`);
        } else {
          lines.push(`${bCharName} (Cue)`);
        }

        if (block.properties?.parenthetical?.trim()) {
          lines.push(`(${block.properties.parenthetical.trim()})`);
        }

        if (block.content.trim()) {
          lines.push(isActorLine ? `>>> ${block.content.trim()}` : block.content.trim());
        }
        lines.push('');
      }
    });
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Triggers a direct browser file download for a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Compiles and downloads a full Production Bible ZIP package containing:
 * - screenplay/script.fountain: Full compiled screenplay in Fountain format
 * - screenplay/script.txt: Plain text formatted script
 * - breakdown/scene_breakdown.csv: Full breakdown matrix (Scene #, Heading, Department, Element Name, Notes)
 * - shots/shot_list.csv: Complete shot list table (Shot #, Scene #, Type, Lens, Movement, Duration, Notes)
 * - sides/: Folder with <Character_Name>_sides.txt for every speaking role
 * - manifest.json: Studio metadata (project name, export timestamp, scene count, runtime, department counts)
 */
export async function exportProductionBibleZip(
  rootNode: WorkspaceNode,
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]>,
  characters: Record<string, Character>,
  shotsInput?: Shot[] | Record<string, Shot[]>,
  elementsInput?: BreakdownElement[] | Record<string, BreakdownElement>,
  analyticsInput?: ScreenplayAnalytics
): Promise<Blob> {
  const zip = new JSZip();

  // Normalize shots and breakdown elements
  const allShots: Shot[] = Array.isArray(shotsInput)
    ? shotsInput
    : shotsInput && typeof shotsInput === 'object'
    ? Object.values(shotsInput).flat()
    : [];

  const allElements: BreakdownElement[] = Array.isArray(elementsInput)
    ? elementsInput
    : elementsInput && typeof elementsInput === 'object'
    ? Object.values(elementsInput)
    : [];

  // Get ordered scenes
  const isScene = rootNode.type === 'scene';
  const sceneIds = isScene ? [rootNode.id] : childrenMap[rootNode.id] || [];
  const scenes: WorkspaceNode[] = sceneIds
    .map((id) => nodes[id])
    .filter((n): n is WorkspaceNode => Boolean(n) && n.type === 'scene');

  // Compute analytics if not provided
  const analytics: ScreenplayAnalytics =
    analyticsInput ||
    calculateScreenplayAnalytics(Object.values(nodes), characters, allElements, allShots);

  // 1. screenplay/script.fountain
  const fountainScript = compileScreenplayToFountain(rootNode, nodes, childrenMap, characters);
  zip.file('screenplay/script.fountain', fountainScript);

  // 2. screenplay/script.txt
  const plainTextScript = compileScreenplayToPlainText(rootNode, nodes, childrenMap, characters);
  zip.file('screenplay/script.txt', plainTextScript);

  // 3. breakdown/scene_breakdown.csv
  const breakdownRows: string[] = ['"Scene #","Heading","Department","Element Name","Notes"'];
  scenes.forEach((sc, idx) => {
    const scNum = getSceneNumber(sc, idx);
    const heading = sc.title || `SCENE ${scNum}`;
    const blockIds = new Set(childrenMap[sc.id] || []);

    const taggedElements = allElements.filter((el) =>
      (el.block_ids || []).some((bid) => blockIds.has(bid))
    );

    taggedElements.forEach((el) => {
      breakdownRows.push(
        [
          escapeCsv(scNum),
          escapeCsv(heading),
          escapeCsv(el.category),
          escapeCsv(el.name),
          escapeCsv(el.notes || ''),
        ].join(',')
      );
    });
  });
  zip.file('breakdown/scene_breakdown.csv', breakdownRows.join('\n'));

  // 4. shots/shot_list.csv
  const shotRows: string[] = [
    '"Shot #","Scene #","Type","Lens","Movement","Duration (s)","Notes"',
  ];

  scenes.forEach((sc, idx) => {
    const scNum = getSceneNumber(sc, idx);
    const sceneShots = allShots
      .filter((s) => s.scene === sc.id)
      .sort((a, b) => (a.shot_number || '').localeCompare(b.shot_number || '', undefined, { numeric: true }));

    sceneShots.forEach((shot) => {
      const notes = shot.blocks && shot.blocks.length > 0
        ? `${shot.blocks.length} linked block(s)`
        : '';
      shotRows.push(
        [
          escapeCsv(shot.shot_number),
          escapeCsv(scNum),
          escapeCsv(shot.shot_type),
          escapeCsv(shot.lens),
          escapeCsv(shot.movement || 'Static'),
          escapeCsv(shot.duration_seconds),
          escapeCsv(notes),
        ].join(',')
      );
    });
  });
  zip.file('shots/shot_list.csv', shotRows.join('\n'));

  // 5. sides/ folder with <Character_Name>_sides.txt for every speaking role
  const speakingCharactersMap = new Map<string, { canonicalName: string; matchingScenes: { scene: WorkspaceNode; sceneNumber: string }[] }>();

  scenes.forEach((sc, idx) => {
    const scNum = getSceneNumber(sc, idx);
    const blockIds = childrenMap[sc.id] || [];

    blockIds.forEach((bid) => {
      const block = nodes[bid];
      if (block?.type === 'dialogue') {
        const charId = block.properties?.character_id;
        const charName = (
          block.properties?.character_name ||
          (charId ? characters[charId]?.name : null) ||
          'CHARACTER'
        ).trim();

        if (charName) {
          const key = charName.toUpperCase();
          if (!speakingCharactersMap.has(key)) {
            speakingCharactersMap.set(key, { canonicalName: charName, matchingScenes: [] });
          }
          const entry = speakingCharactersMap.get(key)!;
          if (!entry.matchingScenes.some((s) => s.scene.id === sc.id)) {
            entry.matchingScenes.push({ scene: sc, sceneNumber: scNum });
          }
        }
      }
    });
  });

  const sidesFolder = zip.folder('sides');
  speakingCharactersMap.forEach(({ canonicalName, matchingScenes }) => {
    const sidesContent = compileCharacterSides(
      canonicalName,
      rootNode.title || 'Screenplay',
      matchingScenes,
      childrenMap,
      nodes,
      characters
    );
    const safeFilename = `${canonicalName.replace(/[^a-zA-Z0-9_-]/g, '_')}_sides.txt`;
    if (sidesFolder) {
      sidesFolder.file(safeFilename, sidesContent);
    } else {
      zip.file(`sides/${safeFilename}`, sidesContent);
    }
  });

  // 6. manifest.json: Studio metadata
  const departmentCounts: Record<string, number> = {};
  allElements.forEach((el) => {
    departmentCounts[el.category] = (departmentCounts[el.category] || 0) + 1;
  });

  const manifest = {
    project_name: rootNode.title || 'Untitled Screenplay',
    project_slug: (rootNode.title || 'screenplay').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    export_timestamp: new Date().toISOString(),
    export_date: new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    format: 'Feature Screenplay Production Bible',
    generator: 'Antigravity Production Studio - Phase 12',
    revision_color: rootNode.revision_color || 'WHITE',
    statistics: {
      total_scenes: scenes.length,
      estimated_runtime_minutes: analytics.estimatedRuntimeMinutes,
      total_dialogue_lines: analytics.totalDialogueLines,
      total_dialogue_words: analytics.totalDialogueWords,
      total_action_words: analytics.totalActionWords,
      total_words: analytics.totalWords,
      total_shots: allShots.length,
      total_production_elements: allElements.length,
      speaking_characters_count: speakingCharactersMap.size,
      department_counts: departmentCounts,
    },
    speaking_characters: Array.from(speakingCharactersMap.values()).map((c) => c.canonicalName),
    files: [
      'screenplay/script.fountain',
      'screenplay/script.txt',
      'breakdown/scene_breakdown.csv',
      'shots/shot_list.csv',
      ...Array.from(speakingCharactersMap.values()).map(
        (c) => `sides/${c.canonicalName.replace(/[^a-zA-Z0-9_-]/g, '_')}_sides.txt`
      ),
      'manifest.json',
    ],
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generate ZIP bundle
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger browser download
  const slug = (rootNode.title || 'Screenplay')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'screenplay';
  const filename = `${slug}_Production_Bible.zip`;
  triggerBlobDownload(zipBlob, filename);

  return zipBlob;
}
