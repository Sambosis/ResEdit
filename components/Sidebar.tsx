import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Snippet, SnippetBankSection } from '../types';

interface DraggableSnippetProps {
  snippet: Snippet;
  sectionTitle: string;
  onDoubleClick: (snippet: Snippet, sectionTitle: string) => void;
}

const DraggableBankSnippet: React.FC<DraggableSnippetProps> = ({ snippet, sectionTitle, onDoubleClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: snippet.id,
    data: {
      snippet,
      source: 'bank',
      sectionTitle,
    },
  });

  const style = {
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onDoubleClick(snippet, sectionTitle)}
      className="p-3 mb-2 bg-white border border-slate-200 rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-all"
    >
      <p className="text-sm text-slate-700">{snippet.content}</p>
    </div>
  );
};

interface SidebarProps {
  snippetBank: SnippetBankSection[];
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  onAddSnippet: (snippet: Snippet, sectionTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ snippetBank, onFileUpload, isLoading, onAddSnippet }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileUpload(event.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <aside className="w-1/3 max-w-sm bg-slate-100 border-r border-slate-200 p-6 flex flex-col h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">AI Resume Editor</h1>
        <p className="text-slate-500 mt-1">Build your resume by dragging snippets.</p>
      </header>

      <div className="mb-6">
        <input
          type="file"
          accept=".txt,.md"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
        />
        <button
          onClick={handleUploadClick}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {isLoading ? 'Parsing...' : 'Upload Resume (.txt, .md)'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <h2 className="text-lg font-semibold text-slate-700 mb-4 sticky top-0 bg-slate-100 py-2">Snippet Bank</h2>
        {snippetBank.length === 0 && !isLoading && (
          <div className="text-center text-slate-500 p-4 border-2 border-dashed border-slate-300 rounded-lg">
            <p>Upload a resume to populate your snippet bank. Double-click to add.</p>
          </div>
        )}
        {snippetBank.map((section, index) => (
          <div key={`${section.title}-${index}`} className="mb-6">
            <h3 className="font-bold text-md text-slate-600 mb-3">{section.title}</h3>
            {section.snippets.map(snippet => (
              <DraggableBankSnippet 
                key={snippet.id} 
                snippet={snippet} 
                sectionTitle={section.title}
                onDoubleClick={onAddSnippet}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};