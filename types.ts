
export interface Snippet {
  id: string;
  content: string;
}

export interface Section {
  id: string;
  title: string;
  snippets: Snippet[];
  subsections?: Section[];
}

export interface SnippetBankSection {
  title: string;
  snippets: Snippet[];
}

export type ExportFormat = 'markdown' | 'pdf' | 'text';

export interface ExportOption {
  value: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
}
