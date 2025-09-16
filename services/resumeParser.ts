export interface ParsedResumeSection {
  title: string;
  snippets: string[];
}

interface HeadingNode {
  level: number;
  text: string;
}

type BufferType = 'paragraph' | 'listItem' | null;

const normalizeLine = (line: string) => line.replace(/\s+$/, '');

export const parseMarkdownResume = (resumeText: string): ParsedResumeSection[] => {
  const sectionsMap = new Map<string, ParsedResumeSection>();
  const sectionOrder: string[] = [];

  const addSnippetToSection = (title: string, snippet: string) => {
    if (!sectionsMap.has(title)) {
      sectionsMap.set(title, { title, snippets: [] });
      sectionOrder.push(title);
    }
    sectionsMap.get(title)!.snippets.push(snippet);
  };

  const lines = resumeText.replace(/\r\n?/g, '\n').split('\n');

  let currentSectionTitle = 'General';
  let headingStack: HeadingNode[] = [];
  let bufferLines: string[] = [];
  let bufferType: BufferType = null;
  let currentListIndent: number | null = null;

  const flushBuffer = () => {
    if (bufferLines.length === 0) {
      return;
    }

    const trimmedLines = [...bufferLines];
    while (trimmedLines.length > 0 && trimmedLines[0].trim() === '') {
      trimmedLines.shift();
    }
    while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === '') {
      trimmedLines.pop();
    }

    if (trimmedLines.length === 0) {
      bufferLines = [];
      bufferType = null;
      currentListIndent = null;
      return;
    }

    const contextHeadings = headingStack
      .filter(node => node.level >= 3)
      .map(node => `${'#'.repeat(node.level)} ${node.text}`);

    const snippetLines = [...contextHeadings, ...trimmedLines];
    const hasMeaningfulContent = snippetLines.some(line => line.trim().length > 0);

    if (hasMeaningfulContent) {
      addSnippetToSection(currentSectionTitle, snippetLines.join('\n'));
    }

    bufferLines = [];
    bufferType = null;
    currentListIndent = null;
  };

  const updateHeadingStack = (level: number, text: string) => {
    headingStack = headingStack.filter(node => node.level < level);
    headingStack.push({ level, text });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\t/g, '    ');

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();

      flushBuffer();

      updateHeadingStack(level, headingText);

      if (level === 1) {
        currentSectionTitle = 'Header';
        bufferType = 'paragraph';
        bufferLines = [`${'#'.repeat(level)} ${headingText}`];
        currentListIndent = null;
        continue;
      }

      if (level === 2) {
        currentSectionTitle = headingText || 'Untitled Section';
        continue;
      }

      // For deeper headings, we only adjust context and keep collecting content.
      continue;
    }

    if (line.trim().length === 0) {
      flushBuffer();
      continue;
    }

    const bulletMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;

      if (bufferType === 'listItem' && currentListIndent !== null && indent > currentListIndent) {
        bufferLines.push(normalizeLine(line));
        continue;
      }

      flushBuffer();
      bufferType = 'listItem';
      currentListIndent = indent;
      bufferLines = [normalizeLine(line)];
      continue;
    }

    if (bufferType === 'listItem') {
      const indentMatch = line.match(/^(\s+)/);
      const indent = indentMatch ? indentMatch[0].length : 0;
      if (currentListIndent !== null && indent > currentListIndent) {
        bufferLines.push(normalizeLine(line));
        continue;
      }

      flushBuffer();
      i -= 1;
      continue;
    }

    if (!bufferType) {
      bufferType = 'paragraph';
      bufferLines = [normalizeLine(line)];
    } else {
      bufferLines.push(normalizeLine(line));
    }
  }

  flushBuffer();

  const parsedSections = sectionOrder
    .map(title => sectionsMap.get(title)!)
    .filter(section => section.snippets.length > 0);

  if (parsedSections.length === 0 && resumeText.trim().length > 0) {
    return [{ title: 'General', snippets: [resumeText.trim()] }];
  }

  return parsedSections;
};
