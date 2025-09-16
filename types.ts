
export interface Snippet {
  id: string;
  content: string;
}

export interface Section {
  id: string;
  title: string;
  snippets: Snippet[];
}

export interface SnippetBankSection {
  title: string;
  snippets: Snippet[];
}
