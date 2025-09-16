export interface ParsedResumeSection {
  title: string;
  snippets: string[];
}

const trimEmptyLines = (lines: string[]): string[] => {
  let start = 0;
  let end = lines.length - 1;

  while (start <= end && lines[start].trim() === '') {
    start += 1;
  }

  while (end >= start && lines[end].trim() === '') {
    end -= 1;
  }

  return start <= end ? lines.slice(start, end + 1) : [];
};

export const parseMarkdownResume = (markdown: string): ParsedResumeSection[] => {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const sections: ParsedResumeSection[] = [];
  let currentSection: ParsedResumeSection | null = null;
  let currentSnippetLines: string[] = [];

  let headerBuffer: string[] = [];
  let headerAdded = false;
  let capturingHeader = true;
  let baseSectionLevel: number | null = null;

  const flushSnippet = () => {
    const trimmedSnippet = trimEmptyLines(currentSnippetLines);
    if (currentSection && trimmedSnippet.length > 0) {
      currentSection.snippets.push(trimmedSnippet.join('\n'));
    }
    currentSnippetLines = [];
  };

  const addHeaderSection = () => {
    if (!headerAdded) {
      const trimmedHeader = trimEmptyLines(headerBuffer);
      if (trimmedHeader.length > 0) {
        sections.push({
          title: 'Header',
          snippets: [trimmedHeader.join('\n')],
        });
      }
      headerBuffer = [];
      headerAdded = true;
    }
    capturingHeader = false;
  };

  const startNewSection = (title: string) => {
    addHeaderSection();
    flushSnippet();
    const cleanedTitle = title.trim() || 'Untitled Section';
    currentSection = { title: cleanedTitle, snippets: [] };
    sections.push(currentSection);
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();

      if (capturingHeader) {
        if (baseSectionLevel === null) {
          if (level === 1) {
            baseSectionLevel = 2;
            headerBuffer.push(rawLine);
            continue;
          }

          baseSectionLevel = level <= 2 ? level : level;
          startNewSection(headingText);
          continue;
        }

        if (level <= (baseSectionLevel ?? level)) {
          startNewSection(headingText);
        } else {
          headerBuffer.push(rawLine);
        }
        continue;
      }

      if (baseSectionLevel === null) {
        baseSectionLevel = level <= 2 ? level : level;
      }

      if (level <= (baseSectionLevel ?? level)) {
        startNewSection(headingText);
      } else {
        if (!currentSection) {
          startNewSection('General');
        } else {
          flushSnippet();
        }
        currentSnippetLines.push(rawLine);
      }
      continue;
    }

    if (capturingHeader) {
      headerBuffer.push(rawLine);
      continue;
    }

    if (!currentSection) {
      startNewSection('General');
    }
    currentSnippetLines.push(rawLine);
  }

  if (capturingHeader) {
    addHeaderSection();
  } else {
    addHeaderSection();
    flushSnippet();
  }

  return sections;
};
