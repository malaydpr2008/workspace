/**
 * Fountain Screenplay Parser Utility
 * Converts standard Fountain screenplay text (.fountain / .txt) into structured
 * AST nodes: Scenes, Action blocks, Dialogue blocks (with character cues and parentheticals).
 * Reference: https://fountain.io/syntax
 */

export interface ParsedBlock {
  type: 'action' | 'dialogue';
  content: string;
  characterName?: string;
  properties: {
    parenthetical?: string;
    transition?: boolean;
    character_name?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export interface ParsedScene {
  title: string;
  blocks: ParsedBlock[];
}

export interface ParsedScript {
  title: string;
  author: string;
  scenes: ParsedScene[];
  characters: string[];
  totalBlocks: number;
}

export function parseFountainScript(rawText: string): ParsedScript {
  const lines = rawText.split(/\r?\n/);
  let title = '';
  let author = '';
  let i = 0;

  // 1. Parse Title Page Metadata if present
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '===' || line.startsWith('===') || line.startsWith('---')) {
      i++;
      break;
    }
    const titleMatch = line.match(/^Title:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    const authorMatch = line.match(/^(?:Author|Authors|Credit):\s*(.+)$/i);
    if (authorMatch) {
      author = authorMatch[1].trim();
    }
    // If we hit a scene heading directly, break out of title page check
    if (/^(\.(?![\.\s])|(INT|EXT|EST|INT\/EXT|I\/E)[\.\s])/i.test(line)) {
      break;
    }
    i++;
  }

  const scenes: ParsedScene[] = [];
  const charactersSet = new Set<string>();
  let currentScene: ParsedScene | null = null;
  let totalBlocks = 0;

  const ensureScene = (fallbackTitle = 'SCENE 1 - INT. LOCATION - DAY') => {
    if (!currentScene) {
      currentScene = {
        title: fallbackTitle,
        blocks: [],
      };
      scenes.push(currentScene);
    }
    return currentScene;
  };

  const isSceneHeading = (l: string): boolean => {
    if (/^\.(?![\.\s])([A-Z0-9_\-\s]+)/i.test(l)) return true;
    return /^(INT|EXT|EST|INT\/EXT|I\/E)[\.\s]/i.test(l);
  };

  const isTransition = (l: string): boolean => {
    if (/^>[^<]+$/.test(l)) return true;
    return /^[A-Z\s]+TO:$/i.test(l) || /^FADE OUT\.?$/i.test(l) || /^FADE IN:$/i.test(l);
  };

  const isParenthetical = (l: string): boolean => {
    return l.startsWith('(') && l.endsWith(')');
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty spacing lines
    if (!line) {
      i++;
      continue;
    }

    // 2. Scene Heading Detection
    if (isSceneHeading(line)) {
      const cleanHeading = line.startsWith('.') ? line.slice(1).trim() : line;
      currentScene = {
        title: cleanHeading.toUpperCase(),
        blocks: [],
      };
      scenes.push(currentScene);
      i++;
      continue;
    }

    // 3. Transition Detection
    if (isTransition(line)) {
      const scene = ensureScene();
      const cleanTransition = line.startsWith('>') ? line.slice(1).trim() : line;
      scene.blocks.push({
        type: 'action',
        content: cleanTransition.toUpperCase(),
        properties: { transition: true },
      });
      totalBlocks++;
      i++;
      continue;
    }

    // 4. Character Cue & Dialogue Detection
    // Conditions for Character Cue:
    // - Line is uppercase (or starts with @ for forced character)
    // - Contains at least one letter
    // - Does not end with punctuation like a period or question mark (unless part of name)
    // - The next line is non-empty dialogue or parenthetical
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const hasNextDialogue = Boolean(nextLine) && !isSceneHeading(nextLine) && !isTransition(nextLine);
    const isCharacterFormat =
      (line.startsWith('@') || (line === line.toUpperCase() && /[A-Z]/.test(line))) &&
      !line.endsWith('.') &&
      line.length <= 40;

    if (isCharacterFormat && hasNextDialogue) {
      const scene = ensureScene();
      const rawChar = line.startsWith('@') ? line.slice(1) : line;
      // Strip extensions like (V.O.), (O.S.), (CONT'D)
      const cleanCharName = rawChar.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();

      if (cleanCharName) {
        charactersSet.add(cleanCharName);
      }

      i++; // advance past character cue line

      let parenthetical = '';
      if (i < lines.length && isParenthetical(lines[i].trim())) {
        parenthetical = lines[i].trim().slice(1, -1).trim();
        i++;
      }

      // Collect spoken dialogue lines until blank line or next element
      const dialogueLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !isSceneHeading(lines[i].trim()) &&
        !isTransition(lines[i].trim())
      ) {
        dialogueLines.push(lines[i].trim());
        i++;
      }

      scene.blocks.push({
        type: 'dialogue',
        content: dialogueLines.join(' '),
        characterName: cleanCharName,
        properties: {
          character_name: cleanCharName,
          parenthetical: parenthetical || undefined,
        },
      });
      totalBlocks++;
      continue;
    }

    // 5. Action / Scene Description Block
    const scene = ensureScene();
    const actionLines: string[] = [line];
    i++;

    while (
      i < lines.length &&
      lines[i].trim() &&
      !isSceneHeading(lines[i].trim()) &&
      !isTransition(lines[i].trim())
    ) {
      const candidate = lines[i].trim();
      const peekNext = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const candidateIsChar =
        (candidate.startsWith('@') || (candidate === candidate.toUpperCase() && /[A-Z]/.test(candidate))) &&
        !candidate.endsWith('.') &&
        candidate.length <= 40 &&
        Boolean(peekNext);

      if (candidateIsChar) {
        break; // Stop action block so the character cue can be processed next
      }

      actionLines.push(candidate);
      i++;
    }

    scene.blocks.push({
      type: 'action',
      content: actionLines.join(' '),
      properties: {},
    });
    totalBlocks++;
  }

  return {
    title: title || 'Imported Screenplay',
    author: author || '',
    scenes,
    characters: Array.from(charactersSet).sort(),
    totalBlocks,
  };
}
