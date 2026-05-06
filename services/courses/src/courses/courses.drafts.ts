import { createHash } from 'crypto';
import { LessonBlock, LessonContent, LessonTokenGloss } from './courses.types';

export type LessonDraftInput = {
  courseSlug: string;
  courseTitle: string;
  lessonSlug: string;
  lessonTitle: string;
  moduleKey?: string;
  moduleName?: string;
  unitKey?: string;
  unitName?: string;
  group?: string;
  order: number;
  lang: string;
  estimatedMinutes: number;
  summary?: string;
  tags?: string[];
  resumeBlocks?: string[];
  lexicon_include?: string[];
  lexicon_exclude?: string[];
  tokenGlosses?: unknown;
  pedagogy?: unknown;
  markdown: string;
};

export type CompiledLessonDraft = {
  lesson: LessonContent;
  validationErrors: string[];
  contentVersion: string;
};

function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function blockId(type: string, text: string, index: number) {
  const base = slugify(text || `${type}-${index + 1}`) || `${type}-${index + 1}`;
  return `${base}-${index + 1}`;
}

export function buildBlocks(markdown: string): LessonBlock[] {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: LessonBlock[] = [];

  let paragraph: string[] = [];
  let list: string[] = [];
  let dialogueTurns: NonNullable<LessonBlock['turns']> = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (!text) return;
    blocks.push({ id: blockId('paragraph', text, blocks.length), type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ id: blockId('list', list[0], blocks.length), type: 'list', items: [...list] });
    list = [];
  };

  const flushDialogue = () => {
    if (!dialogueTurns.length) return;
    blocks.push({
      id: blockId('dialogue', dialogueTurns[0].text || dialogueTurns[0].speaker, blocks.length),
      type: 'dialogue',
      turns: [...dialogueTurns],
    });
    dialogueTurns = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushDialogue();
      blocks.push({
        id: blockId('heading', heading[2], blocks.length),
        type: 'heading',
        level: heading[1].length,
        text: heading[2].trim(),
      });
      continue;
    }

    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem) {
      const speaker = listItem[1].trim();
      const quoteLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const quote = lines[j].match(/^\s*>\s?(.*)$/);
        if (!quote) break;
        quoteLines.push(quote[1].trim());
        j += 1;
      }

      if (speaker && quoteLines.length > 0) {
        flushParagraph();
        flushList();
        const [text = '', pronunciation, translation, ...rest] = quoteLines;
        const translationText = [translation, ...rest]
          .filter(Boolean)
          .join(' ')
          .trim() || undefined;
        dialogueTurns.push({
          speaker,
          text,
          pronunciation: pronunciation || undefined,
          translation: translationText,
        });
        i = j - 1;
        continue;
      }

      flushParagraph();
      flushDialogue();
      list.push(listItem[1].trim());
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushDialogue();
      continue;
    }

    flushList();
    flushDialogue();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushDialogue();
  return blocks;
}

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeGlosses(input: unknown): LessonTokenGloss[] {
  if (!Array.isArray(input)) return [];
  const out: LessonTokenGloss[] = [];
  const seen = new Set<string>();
  for (const row of input) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const token = String(item.token || '').trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      token,
      baseWord: item.baseWord ? String(item.baseWord).trim() : undefined,
      translation: item.translation ? String(item.translation).trim() : undefined,
      pronunciation: item.pronunciation ? String(item.pronunciation).trim() : undefined,
      usage: item.usage ? String(item.usage).trim() : undefined,
      examples: asStringArray(item.examples),
    });
  }
  return out;
}

function normalizePedagogy(input: unknown): LessonContent['pedagogy'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const row = input as Record<string, unknown>;
  return {
    defaultMode:
      row.defaultMode === 'full' ? 'full' : undefined,
    pedagogyFocus: row.pedagogyFocus ? String(row.pedagogyFocus) : undefined,
    unitDeckSlug: row.unitDeckSlug ? String(row.unitDeckSlug) : undefined,
    autoTrackPhrasebook:
      typeof row.autoTrackPhrasebook === 'boolean' ? row.autoTrackPhrasebook : undefined,
    autoTrackLexicon:
      typeof row.autoTrackLexicon === 'boolean' ? row.autoTrackLexicon : undefined,
  };
}

export function compileLessonDraft(raw: LessonDraftInput): CompiledLessonDraft {
  const validationErrors: string[] = [];
  if (!raw.courseSlug) validationErrors.push('courseSlug is required');
  if (!raw.courseTitle) validationErrors.push('courseTitle is required');
  if (!raw.lessonSlug) validationErrors.push('lessonSlug is required');
  if (!raw.lessonTitle) validationErrors.push('lessonTitle is required');
  if (!raw.lang) validationErrors.push('lang is required');
  if (!raw.markdown || !raw.markdown.trim()) validationErrors.push('markdown is required');
  if (!Number.isFinite(raw.order) || raw.order <= 0) validationErrors.push('order must be > 0');
  if (!Number.isFinite(raw.estimatedMinutes) || raw.estimatedMinutes <= 0) {
    validationErrors.push('estimatedMinutes must be > 0');
  }

  const cleaned = {
    ...raw,
    courseSlug: String(raw.courseSlug || '').trim(),
    courseTitle: String(raw.courseTitle || '').trim(),
    lessonSlug: String(raw.lessonSlug || '').trim(),
    lessonTitle: String(raw.lessonTitle || '').trim(),
    moduleKey: raw.moduleKey ? String(raw.moduleKey).trim() : undefined,
    moduleName: raw.moduleName ? String(raw.moduleName).trim() : undefined,
    unitKey: raw.unitKey ? String(raw.unitKey).trim() : undefined,
    unitName: raw.unitName ? String(raw.unitName).trim() : undefined,
    group: raw.group ? String(raw.group).trim() : undefined,
    order: Math.max(1, Math.round(Number(raw.order || 1))),
    lang: String(raw.lang || 'ga').trim(),
    estimatedMinutes: Math.max(1, Math.round(Number(raw.estimatedMinutes || 1))),
    summary: raw.summary ? String(raw.summary) : undefined,
    tags: asStringArray(raw.tags),
    resumeBlocks: asStringArray(raw.resumeBlocks),
    lexicon_include: asStringArray(raw.lexicon_include),
    lexicon_exclude: asStringArray(raw.lexicon_exclude),
    tokenGlosses: normalizeGlosses(raw.tokenGlosses),
    pedagogy: normalizePedagogy(raw.pedagogy),
    markdown: String(raw.markdown || ''),
  };

  const blocks = buildBlocks(cleaned.markdown);
  const contentVersion = createHash('sha256')
    .update(
      JSON.stringify({
        ...cleaned,
        markdown: undefined,
      }),
    )
    .update('\n')
    .update(cleaned.markdown)
    .digest('hex')
    .slice(0, 16);

  const lesson: LessonContent = {
    courseSlug: cleaned.courseSlug,
    courseTitle: cleaned.courseTitle,
    lessonSlug: cleaned.lessonSlug,
    lessonTitle: cleaned.lessonTitle,
    moduleKey: cleaned.moduleKey,
    moduleName: cleaned.moduleName,
    unitKey: cleaned.unitKey,
    unitName: cleaned.unitName,
    group: cleaned.group,
    order: cleaned.order,
    lang: cleaned.lang,
    estimatedMinutes: cleaned.estimatedMinutes,
    summary: cleaned.summary,
    tags: cleaned.tags,
    resumeBlocks: cleaned.resumeBlocks,
    lexicon_include: cleaned.lexicon_include,
    lexicon_exclude: cleaned.lexicon_exclude,
    tokenGlosses: cleaned.tokenGlosses,
    pedagogy: cleaned.pedagogy,
    markdown: cleaned.markdown,
    blocks,
    contentVersion,
  };

  return {
    lesson,
    validationErrors,
    contentVersion,
  };
}
