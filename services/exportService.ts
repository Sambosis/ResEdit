import { jsPDF } from 'jspdf';
import { ExportFormat, ExportOption, Section } from '../types';
import { isHeaderSectionTitle } from '../utils/sections';

export const EXPORT_FORMATS: ExportOption[] = [
  { value: 'markdown', label: 'Markdown (.md)', extension: 'md', mimeType: 'text/markdown' },
  { value: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', mimeType: 'application/pdf' },
  { value: 'text', label: 'Plain Text (.txt)', extension: 'txt', mimeType: 'text/plain' },
];

const trimSnippetContent = (content: string): string => (content ?? '').replace(/\r/g, '').trim();

const splitSnippetLines = (content: string): string[] =>
  trimSnippetContent(content)
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean);

const hasResumeContent = (sections: Section[]): boolean =>
  sections.some(
    section =>
      section.title.trim().length > 0 ||
      section.snippets.some(snippet => snippet.content.trim().length > 0)
  );

const downloadTextFile = (content: string, filename: string, mimeType: string) => {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const generateMarkdown = (sections: Section[]): string =>
  sections
    .map(section => {
      if (isHeaderSectionTitle(section.title)) {
        const headerParts: string[] = [];

        section.snippets.forEach((snippet, index) => {
          if (index === 0) {
            const [firstLine, ...rest] = splitSnippetLines(snippet.content);
            if (firstLine) {
              headerParts.push(`# ${firstLine.replace(/^#*\s*/, '')}`);
            }
            if (rest.length > 0) {
              headerParts.push(rest.join('  \n'));
            }
            return;
          }

          const additionalLines = splitSnippetLines(snippet.content);
          if (additionalLines.length > 0) {
            headerParts.push(additionalLines.join('  \n'));
          }
        });

        return headerParts.join('\n\n').trim();
      }

      const snippetLines = section.snippets
        .map(snippet => trimSnippetContent(snippet.content))
        .filter(Boolean)
        .map(content => `- ${content}`);

      if (snippetLines.length === 0) {
        return `## ${section.title}`.trim();
      }

      return [`## ${section.title}`, snippetLines.join('\n')].join('\n').trim();
    })
    .filter(Boolean)
    .join('\n\n');

const generatePlainText = (sections: Section[]): string =>
  sections
    .map(section => {
      if (isHeaderSectionTitle(section.title)) {
        const lines: string[] = [];

        section.snippets.forEach(snippet => {
          const snippetLines = splitSnippetLines(snippet.content);
          if (snippetLines.length > 0) {
            lines.push(...snippetLines);
          }
        });

        return lines.join('\n').trim();
      }

      const snippetLines = section.snippets
        .map(snippet => trimSnippetContent(snippet.content))
        .filter(Boolean)
        .map(content => `• ${content}`);

      if (snippetLines.length === 0) {
        return section.title.toUpperCase();
      }

      return [`${section.title.toUpperCase()}`, snippetLines.join('\n')].join('\n').trim();
    })
    .filter(Boolean)
    .join('\n\n');

const generatePdf = (sections: Section[], fileName: string) => {
  if (typeof window === 'undefined') return;

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const lineHeight = 18;
  const bulletSpacing = 8;
  const sectionSpacing = 14;

  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;

  sections.forEach((section, sectionIndex) => {
    if (isHeaderSectionTitle(section.title)) {
      let isFirstLine = true;

      section.snippets.forEach(snippet => {
        const snippetLines = splitSnippetLines(snippet.content);

        snippetLines.forEach(line => {
          if (isFirstLine) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            isFirstLine = false;
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
          }

          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }

          doc.text(line, margin, y);
          y += lineHeight;
        });
      });

      if (sectionIndex < sections.length - 1) {
        y += sectionSpacing;
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      }

      return;
    }

    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    const sectionTitle = trimSnippetContent(section.title) || section.title;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(sectionTitle, margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const snippetContents = section.snippets
      .map(snippet => trimSnippetContent(snippet.content))
      .filter(Boolean);

    if (snippetContents.length === 0) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text('No entries yet.', margin, y);
      y += lineHeight;
    } else {
      snippetContents.forEach((content, snippetIndex) => {
        const bulletText = `• ${content}`;
        const lines = doc.splitTextToSize(bulletText, maxLineWidth);

        lines.forEach(line => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });

        if (snippetIndex < snippetContents.length - 1) {
          y += bulletSpacing;
        }
      });
    }

    if (sectionIndex < sections.length - 1) {
      y += sectionSpacing;
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }
  });

  doc.save(`${fileName}.pdf`);
};

export const getExportFormatLabel = (format: ExportFormat) => {
  const option = EXPORT_FORMATS.find(item => item.value === format);
  return option ? option.label : format;
};

export const exportResume = (
  sections: Section[],
  format: ExportFormat,
  fileName = 'resume'
): ExportOption => {
  if (!hasResumeContent(sections)) {
    throw new Error('Cannot export an empty resume.');
  }

  const option = EXPORT_FORMATS.find(item => item.value === format);
  if (!option) {
    throw new Error(`Unsupported export format: ${format}`);
  }

  const baseFileName = fileName.trim() || 'resume';

  switch (option.value) {
    case 'markdown':
      downloadTextFile(generateMarkdown(sections), `${baseFileName}.${option.extension}`, option.mimeType);
      break;
    case 'text':
      downloadTextFile(generatePlainText(sections), `${baseFileName}.${option.extension}`, option.mimeType);
      break;
    case 'pdf':
      generatePdf(sections, baseFileName);
      break;
    default:
      throw new Error(`Export handler missing for format: ${format}`);
  }

  return option;
};
