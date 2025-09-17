import { ParsedSection } from '../types';

export const HEADER_SECTION_KEY = 'header';

const SECTION_TITLE_ALIASES: Record<string, string> = {
  'header': 'Header',
  'contact information': 'Header',
  'contact info': 'Header',
  'contact details': 'Header',
  'personal information': 'Header',
  'personal info': 'Header',
  'personal details': 'Header',
};

export const canonicalSectionTitle = (title: string): string => {
  const trimmed = (title ?? '').trim();
  if (!trimmed) {
    return 'Untitled Section';
  }

  const normalized = trimmed.toLowerCase();
  const alias = SECTION_TITLE_ALIASES[normalized];

  if (alias) {
    return alias;
  }

  return trimmed.replace(/\s+/g, ' ');
};

export const getSectionKey = (title: string): string => {
  return canonicalSectionTitle(title).trim().toLowerCase();
};

export const isHeaderTitle = (title: string): boolean => {
  return getSectionKey(title) === HEADER_SECTION_KEY;
};

export const sanitizeSnippetContent = (content: string): string => {
  if (typeof content !== 'string') {
    return '';
  }

  const normalizedLineEndings = content.replace(/\r\n/g, '\n');
  const lines = normalizedLineEndings
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cleanedLines = lines.map(line =>
    line
      .replace(/^[-*•●]\s*/, '')
      .replace(/\s{2,}/g, ' ')
  );

  return cleanedLines.join('\n').trim();
};

export const sanitizeParsedSections = (sections: ParsedSection[]): ParsedSection[] => {
  return sections
    .map(section => ({
      title: canonicalSectionTitle(section.title),
      snippets: (section.snippets || [])
        .map(sanitizeSnippetContent)
        .filter(snippet => snippet.length > 0),
    }))
    .filter(section => section.title.trim().length > 0 && section.snippets.length > 0);
};
