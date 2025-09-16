import { jsPDF } from 'jspdf';
import { ExportFormat, ExportOption, Section } from '../types';

export const EXPORT_FORMATS: ExportOption[] = [
  { value: 'markdown', label: 'Markdown (.md)', extension: 'md', mimeType: 'text/markdown' },
  { value: 'pdf', label: 'PDF (.pdf)', extension: 'pdf', mimeType: 'application/pdf' },
  { value: 'text', label: 'Plain Text (.txt)', extension: 'txt', mimeType: 'text/plain' },
];

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
      const cleanedTitle = section.title.trim();
      const body = section.snippets
        .map(snippet => snippet.content.trim())
        .filter(snippet => snippet.length > 0)
        .join('\n\n');

      if (!cleanedTitle && !body) {
        return '';
      }

      if (!body) {
        return `## ${cleanedTitle}`.trim();
      }

      if (!cleanedTitle) {
        return body;
      }

      return `## ${cleanedTitle}\n\n${body}`.trim();
    })
    .filter(section => section.length > 0)
    .join('\n\n');

const generatePlainText = (sections: Section[]): string =>
  sections
    .map(section => {
      const snippetText = section.snippets
        .map(snippet => `• ${snippet.content}`)
        .join('\n');
      return `${section.title.toUpperCase()}\n${snippetText}`.trim();
    })
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
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(section.title, margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    if (section.snippets.length === 0) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text('No entries yet.', margin, y);
      y += lineHeight;
    } else {
      section.snippets.forEach((snippet, snippetIndex) => {
        const bulletText = `• ${snippet.content}`;
        const lines = doc.splitTextToSize(bulletText, maxLineWidth);

        lines.forEach(line => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });

        if (snippetIndex < section.snippets.length - 1) {
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
