import { WorkspaceNode, Character, ScriptNote } from '@/types/workspace';

/**
 * Compiles a Screenplay composite node hierarchy with annotated review notes and marginalia
 */
export function compileScreenplayWithNotes(
  rootNode: WorkspaceNode,
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]>,
  characters: Record<string, Character>,
  notesByNode: Record<string, ScriptNote[]>
): string {
  const lines: string[] = [];

  // Title Page Header
  const title = rootNode.title || 'UNTITLED SCREENPLAY';
  const author = rootNode.properties?.author || 'Antigravity Studio';
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  lines.push(`Title: ${title.toUpperCase()} (ANNOTATED REVIEW DRAFT)`);
  lines.push(`Credit: written by`);
  lines.push(`Author: ${author}`);
  lines.push(`Draft date: ${dateStr}`);
  lines.push(`Format: Feature Screenplay with Marginalia & Review Notes`);
  lines.push('');
  lines.push('===');
  lines.push('');

  const formatNotes = (nodeId: string, indent: string = '  '): string[] => {
    const list = notesByNode[nodeId] || [];
    if (list.length === 0) return [];

    const noteLines: string[] = [];
    noteLines.push('/*');
    noteLines.push(`${indent}[[ REVIEW NOTES (${list.length}) ]]`);
    list.forEach((n) => {
      const status = n.is_resolved ? '[RESOLVED]' : '[OPEN]';
      noteLines.push(
        `${indent}• [${n.category}] ${status} ${n.author_name} (${n.author_role}): "${n.text}"`
      );
      if (n.replies && n.replies.length > 0) {
        n.replies.forEach((rep) => {
          noteLines.push(
            `${indent}    ↳ ${rep.author_name} (${rep.author_role}): "${rep.text}"`
          );
        });
      }
    });
    noteLines.push('*/');
    noteLines.push('');
    return noteLines;
  };

  // Collect scenes
  const isScene = rootNode.type === 'scene';
  const sceneIds = isScene
    ? [rootNode.id]
    : childrenMap[rootNode.id] || [];

  sceneIds.forEach((sceneId) => {
    const sceneNode = nodes[sceneId];
    if (!sceneNode) return;

    if (sceneNode.type === 'scene') {
      const heading = (sceneNode.title || 'INT. SCENE - DAY').toUpperCase().trim();
      const fountainHeading = /^(INT|EXT|EST|INT\/EXT|I\/E)\.?/i.test(heading)
        ? heading
        : `.${heading}`;

      lines.push('');
      lines.push(fountainHeading);
      lines.push('');

      // Scene heading notes
      const sceneNotes = formatNotes(sceneNode.id);
      if (sceneNotes.length > 0) {
        lines.push(...sceneNotes);
      }

      // Iterate through scene blocks
      const blockIds = childrenMap[sceneNode.id] || [];
      blockIds.forEach((blockId) => {
        const block = nodes[blockId];
        if (!block) return;

        if (block.type === 'action') {
          if (block.content.trim()) {
            lines.push(block.content.trim());
            lines.push('');
          }
        } else if (block.type === 'dialogue') {
          const charId = block.properties?.character_id;
          const charName =
            block.properties?.character_name ||
            (charId ? characters[charId]?.name : null) ||
            'CHARACTER';

          lines.push(charName.toUpperCase().trim());

          if (block.properties?.parenthetical?.trim()) {
            lines.push(`(${block.properties.parenthetical.trim()})`);
          }

          if (block.content.trim()) {
            lines.push(block.content.trim());
          }
          lines.push('');
        } else {
          if (block.content?.trim()) {
            lines.push(block.content.trim());
            lines.push('');
          }
        }

        // Block level notes
        const blockNotes = formatNotes(block.id);
        if (blockNotes.length > 0) {
          lines.push(...blockNotes);
        }
      });
    }
  });

  return lines.join('\n');
}

/**
 * Compiles a Screenplay composite node hierarchy into standard Fountain syntax (.fountain)
 * See: https://fountain.io/syntax
 */
export function compileScreenplayToFountain(
  rootNode: WorkspaceNode,
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]>,
  characters: Record<string, Character>
): string {
  const lines: string[] = [];

  // Title Page Header
  const title = rootNode.title || 'UNTITLED SCREENPLAY';
  const author = rootNode.properties?.author || 'Antigravity Studio';
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  lines.push(`Title: ${title.toUpperCase()}`);
  lines.push(`Credit: written by`);
  lines.push(`Author: ${author}`);
  lines.push(`Draft date: ${dateStr}`);
  lines.push(`Format: Feature Screenplay`);
  lines.push('');
  lines.push('===');
  lines.push('');

  // Collect scenes
  const isScene = rootNode.type === 'scene';
  const sceneIds = isScene
    ? [rootNode.id]
    : childrenMap[rootNode.id] || [];

  sceneIds.forEach((sceneId) => {
    const sceneNode = nodes[sceneId];
    if (!sceneNode) return;

    if (sceneNode.type === 'scene') {
      const heading = (sceneNode.title || 'INT. SCENE - DAY').toUpperCase().trim();
      // Ensure Fountain recognized scene heading prefix
      const fountainHeading = /^(INT|EXT|EST|INT\/EXT|I\/E)\.?/i.test(heading)
        ? heading
        : `.${heading}`;

      lines.push('');
      lines.push(fountainHeading);
      lines.push('');

      // Iterate through scene blocks
      const blockIds = childrenMap[sceneNode.id] || [];
      blockIds.forEach((blockId) => {
        const block = nodes[blockId];
        if (!block) return;

        if (block.type === 'action') {
          if (block.content.trim()) {
            lines.push(block.content.trim());
            lines.push('');
          }
        } else if (block.type === 'dialogue') {
          const charId = block.properties?.character_id;
          const charName =
            block.properties?.character_name ||
            (charId ? characters[charId]?.name : null) ||
            'CHARACTER';

          lines.push(charName.toUpperCase().trim());

          if (block.properties?.parenthetical?.trim()) {
            lines.push(`(${block.properties.parenthetical.trim()})`);
          }

          if (block.content.trim()) {
            lines.push(block.content.trim());
          }
          lines.push('');
        } else {
          if (block.content?.trim()) {
            lines.push(block.content.trim());
            lines.push('');
          }
        }
      });
    }
  });

  return lines.join('\n');
}

/**
 * Compiles a Story composite node hierarchy into clean Markdown prose (.md)
 */
export function compileStoryToMarkdown(
  rootNode: WorkspaceNode,
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]>
): string {
  const lines: string[] = [];

  const title = rootNode.title || 'Untitled Story';
  lines.push(`# ${title}`);
  if (rootNode.properties?.genre) {
    lines.push(`*Genre: ${rootNode.properties.genre}*`);
  }
  lines.push('');

  const isChapter = rootNode.type === 'chapter';
  const chapterIds = isChapter
    ? [rootNode.id]
    : childrenMap[rootNode.id] || [];

  chapterIds.forEach((chapterId, idx) => {
    const chapterNode = nodes[chapterId];
    if (!chapterNode) return;

    const chapterTitle =
      chapterNode.title || `Chapter ${idx + 1}`;
    lines.push(`## ${chapterTitle}`);
    lines.push('');

    const paragraphIds = childrenMap[chapterNode.id] || [];
    paragraphIds.forEach((paraId) => {
      const para = nodes[paraId];
      if (!para) return;

      if (para.content?.trim()) {
        lines.push(para.content.trim());
        lines.push('');
      }
    });
  });

  return lines.join('\n');
}

/**
 * Compiles an Article composite node into editorial Markdown (.md)
 */
export function compileArticleToMarkdown(
  rootNode: WorkspaceNode,
  nodes: Record<string, WorkspaceNode>,
  childrenMap: Record<string, string[]>
): string {
  const lines: string[] = [];

  const title = rootNode.title || 'Untitled Article';
  lines.push(`# ${title}`);
  lines.push('');

  if (rootNode.properties?.tags && Array.isArray(rootNode.properties.tags)) {
    lines.push(`**Tags:** ${rootNode.properties.tags.join(', ')}`);
  }
  lines.push(`**Published:** ${new Date(rootNode.created_at).toLocaleDateString()}`);
  lines.push('');

  if (rootNode.content?.trim()) {
    lines.push(`> ${rootNode.content.trim()}`);
    lines.push('');
  }

  const childIds = childrenMap[rootNode.id] || [];
  childIds.forEach((cid) => {
    const block = nodes[cid];
    if (!block) return;

    if (block.type === 'heading') {
      lines.push(`### ${block.title || block.content}`);
      lines.push('');
    } else {
      if (block.content?.trim()) {
        lines.push(block.content.trim());
        lines.push('');
      }
    }
  });

  return lines.join('\n');
}

/**
 * Triggers a direct browser file download for text/compilation outputs
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
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
 * Copies content to clipboard with fallback
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
