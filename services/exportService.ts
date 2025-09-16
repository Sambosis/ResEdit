import { Section } from '../types';

export type ResumeExportFormat = 'md' | 'txt' | 'json' | 'html';

export interface ResumeExportFormatOption {
  value: ResumeExportFormat;
  label: string;
  description?: string;
}

interface NormalizedSection {
  title: string;
  items: string[];
}

interface FormatMetadata {
  label: string;
  extension: string;
  mimeType: string;
  description?: string;
  serializer: (sections: NormalizedSection[]) => string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeSections = (sections: Section[] = []): NormalizedSection[] =>
  sections
    .map(section => ({
      title: section.title?.trim() ?? '',
      items: (section.snippets ?? [])
        .map(snippet => snippet.content?.trim() ?? '')
        .filter(Boolean),
    }))
    .filter(section => section.title.length > 0 || section.items.length > 0);

const formatConfig: Record<ResumeExportFormat, FormatMetadata> = {
  md: {
    label: 'Markdown (.md)',
    extension: 'md',
    mimeType: 'text/markdown',
    description: 'Markdown formatted resume ready for Markdown editors.',
    serializer: sections =>
      sections
        .map(({ title, items }) => {
          const header = title ? `## ${title}` : '';
          const bullets = items.map(item => `- ${item}`).join('\n');
          return [header, bullets].filter(Boolean).join('\n\n');
        })
        .join('\n\n'),
  },
  txt: {
    label: 'Plain text (.txt)',
    extension: 'txt',
    mimeType: 'text/plain',
    description: 'Plain text version with headings and bullet points.',
    serializer: sections =>
      sections
        .map(({ title, items }) => {
          const header = title
            ? `${title.toUpperCase()}\n${'-'.repeat(title.length)}`
            : '';
          const bullets = items.map(item => `• ${item}`).join('\n');
          return [header, bullets].filter(Boolean).join('\n\n');
        })
        .join('\n\n'),
  },
  json: {
    label: 'JSON (.json)',
    extension: 'json',
    mimeType: 'application/json',
    description: 'Structured data for integrations or future editing.',
    serializer: sections =>
      JSON.stringify(
        {
          sections: sections.map(({ title, items }) => ({
            title,
            snippets: items,
          })),
        },
        null,
        2,
      ),
  },
  html: {
    label: 'HTML (.html)',
    extension: 'html',
    mimeType: 'text/html',
    description: 'Styled HTML document ready for printing or conversion.',
    serializer: sections => {
      const renderedSections = sections
        .map(({ title, items }) => {
          const sectionParts: string[] = [];
          if (title) {
            sectionParts.push(`<h2>${escapeHtml(title)}</h2>`);
          }
          if (items.length > 0) {
            const listItems = items
              .map(item => `<li>${escapeHtml(item)}</li>`)
              .join('\n');
            sectionParts.push(`<ul>\n${listItems}\n</ul>`);
          }
          return `<section>\n${sectionParts.join('\n')}\n</section>`;
        })
        .join('\n\n');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Resume</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5; margin: 2rem auto; max-width: 800px; }
    h1 { text-align: center; font-size: 2rem; margin-bottom: 2rem; color: #0f172a; }
    section { margin-bottom: 1.5rem; }
    h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    ul { list-style: disc; margin-left: 1.5rem; }
  </style>
</head>
<body>
  <h1>Resume</h1>
  ${renderedSections}
</body>
</html>`;
    },
  },
};

const ensureFormatConfig = (format: ResumeExportFormat): FormatMetadata => {
  const config = formatConfig[format];
  if (!config) {
    throw new Error(`Unsupported resume export format: ${format}`);
  }
  return config;
};

export const resumeExportFormats: ResumeExportFormatOption[] = Object.entries(formatConfig).map(
  ([value, config]) => ({
    value: value as ResumeExportFormat,
    label: config.label,
    description: config.description,
  }),
);

export const hasExportableContent = (sections: Section[]): boolean =>
  normalizeSections(sections).length > 0;

export const generateResumeContent = (
  sections: Section[],
  format: ResumeExportFormat,
): string => {
  const config = ensureFormatConfig(format);
  const normalizedSections = normalizeSections(sections);

  if (normalizedSections.length === 0) {
    throw new Error('No resume content to export');
  }

  return config.serializer(normalizedSections);
};

export const exportResumeToFile = (
  sections: Section[],
  format: ResumeExportFormat,
  filename = 'resume',
): void => {
  const config = ensureFormatConfig(format);
  const content = generateResumeContent(sections, format);
  const blob = new Blob([content], { type: config.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${filename}.${config.extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getFormatLabel = (format: ResumeExportFormat): string =>
  ensureFormatConfig(format).label;

export const getFormatExtension = (format: ResumeExportFormat): string =>
  ensureFormatConfig(format).extension;

export const getFormatMimeType = (format: ResumeExportFormat): string =>
  ensureFormatConfig(format).mimeType;
