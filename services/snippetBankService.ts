import { v4 as uuidv4 } from 'uuid';
import { ParsedSection, Snippet, SnippetBankSection } from '../types';
import {
  canonicalSectionTitle,
  getSectionKey,
  HEADER_SECTION_KEY,
  sanitizeParsedSections,
  sanitizeSnippetContent,
} from './sectionUtils';

const MAX_HEADER_LINES = 4;

const SECTION_KEYWORDS = [
  'summary',
  'professional summary',
  'objective',
  'profile',
  'experience',
  'work experience',
  'professional experience',
  'employment history',
  'skills',
  'technical skills',
  'education',
  'projects',
  'certifications',
  'awards',
  'volunteer',
  'leadership',
  'publications',
];

const isLikelySectionHeading = (line: string, index: number): boolean => {
  const collapsed = line.replace(/\s+/g, ' ');
  const lower = collapsed.toLowerCase();

  if (SECTION_KEYWORDS.some(keyword => lower.startsWith(keyword))) {
    return true;
  }

  if (/^[-*•●]/.test(line)) {
    return true;
  }

  if (index > 0) {
    const lettersOnly = collapsed.replace(/[^A-Za-z]/g, '');
    const hasDivider = /[|,@]/.test(collapsed);
    if (lettersOnly.length >= 4 && collapsed === collapsed.toUpperCase() && !hasDivider) {
      return true;
    }
  }

  return false;
};

const buildHeaderSnippetFromText = (resumeText: string): string | null => {
  if (!resumeText) {
    return null;
  }

  const lines = resumeText.split(/\r?\n/);
  const headerLines: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (headerLines.length > 0) {
        break;
      }
      continue;
    }

    const normalized = trimmed.replace(/\s+/g, ' ');

    if (isLikelySectionHeading(normalized, headerLines.length)) {
      break;
    }

    headerLines.push(normalized);

    if (headerLines.length >= MAX_HEADER_LINES) {
      break;
    }
  }

  const sanitizedHeaderLines = headerLines
    .map(line => line.replace(/\s*\|\s*/g, ' | ').replace(/\s{2,}/g, ' ').trim())
    .filter(line => line.length > 0);

  if (sanitizedHeaderLines.length === 0) {
    return null;
  }

  while (sanitizedHeaderLines.length > 1) {
    const candidate = sanitizedHeaderLines[sanitizedHeaderLines.length - 1];
    if (isLikelySectionHeading(candidate, sanitizedHeaderLines.length - 1)) {
      sanitizedHeaderLines.pop();
    } else {
      break;
    }
  }

  const [name, ...details] = sanitizedHeaderLines;

  if (!name) {
    return null;
  }

  const detailLine = details.join(' • ');

  return detailLine ? `${name}\n${detailLine}` : name;
};

export const prepareSectionsForBank = (
  sections: ParsedSection[],
  resumeText: string
): ParsedSection[] => {
  const sanitizedSections = sanitizeParsedSections(sections);

  if (sanitizedSections.length === 0) {
    const headerSnippet = buildHeaderSnippetFromText(resumeText);
    if (!headerSnippet) {
      return sanitizedSections;
    }
    const sanitizedHeader = sanitizeSnippetContent(headerSnippet);
    return sanitizedHeader
      ? [{ title: 'Header', snippets: [sanitizedHeader] }]
      : sanitizedSections;
  }

  const headerIndex = sanitizedSections.findIndex(section => getSectionKey(section.title) === HEADER_SECTION_KEY);

  if (headerIndex > -1) {
    const sectionsCopy = [...sanitizedSections];
    if (headerIndex !== 0) {
      const [headerSection] = sectionsCopy.splice(headerIndex, 1);
      sectionsCopy.unshift(headerSection);
    }
    return sectionsCopy;
  }

  const headerSnippet = buildHeaderSnippetFromText(resumeText);

  if (!headerSnippet) {
    return sanitizedSections;
  }

  const sanitizedHeader = sanitizeSnippetContent(headerSnippet);

  if (!sanitizedHeader) {
    return sanitizedSections;
  }

  return [
    { title: 'Header', snippets: [sanitizedHeader] },
    ...sanitizedSections,
  ];
};

export interface MergeResult {
  bank: SnippetBankSection[];
  addedSections: number;
  addedSnippets: number;
}

const cloneSection = (section: SnippetBankSection): SnippetBankSection => ({
  title: canonicalSectionTitle(section.title),
  snippets: section.snippets.map(snippet => ({
    id: snippet.id,
    content: sanitizeSnippetContent(snippet.content),
  })),
});

const ensureUniqueSnippets = (snippets: Snippet[]): Snippet[] => {
  const seen = new Set<string>();
  const unique: Snippet[] = [];

  snippets.forEach(snippet => {
    const key = sanitizeSnippetContent(snippet.content).toLowerCase();
    if (!seen.has(key) && snippet.content.trim().length > 0) {
      seen.add(key);
      unique.push({ ...snippet, content: sanitizeSnippetContent(snippet.content) });
    }
  });

  return unique;
};

export const mergeSectionsIntoSnippetBank = (
  existingBank: SnippetBankSection[],
  incomingSections: ParsedSection[]
): MergeResult => {
  const bankMap = new Map<string, SnippetBankSection>();

  existingBank.forEach(section => {
    const key = getSectionKey(section.title);
    bankMap.set(key, cloneSection(section));
  });

  let addedSections = 0;
  let addedSnippets = 0;

  incomingSections.forEach(section => {
    const key = getSectionKey(section.title);
    const canonicalTitle = canonicalSectionTitle(section.title);
    const snippets = section.snippets
      .map(sanitizeSnippetContent)
      .filter(content => content.length > 0);

    if (snippets.length === 0) {
      return;
    }

    if (bankMap.has(key)) {
      const existing = bankMap.get(key)!;
      const existingContentKeys = new Set(existing.snippets.map(snippet => snippet.content.toLowerCase()));

      snippets.forEach(content => {
        const normalizedContent = content.toLowerCase();
        if (!existingContentKeys.has(normalizedContent)) {
          const newSnippet: Snippet = {
            id: `bank-${uuidv4()}`,
            content,
          };
          existing.snippets.push(newSnippet);
          existingContentKeys.add(normalizedContent);
          addedSnippets += 1;
        }
      });

      existing.snippets = ensureUniqueSnippets(existing.snippets);
    } else {
      bankMap.set(key, {
        title: canonicalTitle,
        snippets: snippets.map(content => ({
          id: `bank-${uuidv4()}`,
          content,
        })),
      });
      addedSections += 1;
      addedSnippets += snippets.length;
    }
  });

  const mergedSections = Array.from(bankMap.values());

  const headerIndex = mergedSections.findIndex(section => getSectionKey(section.title) === HEADER_SECTION_KEY);
  if (headerIndex > 0) {
    const [headerSection] = mergedSections.splice(headerIndex, 1);
    mergedSections.unshift(headerSection);
  }

  return {
    bank: mergedSections,
    addedSections,
    addedSnippets,
  };
};
