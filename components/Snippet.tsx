
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Snippet as SnippetType } from '../types';
import { EditableText } from './EditableText';

interface SnippetProps {
  snippet: SnippetType;
  sectionId: string;
  onRemove: (sectionId: string, snippetId: string) => void;
  onUpdateContent: (sectionId: string, snippetId: string, newContent: string) => void;
  onImprove: (sectionId: string, snippetId: string, content: string) => void;
}

export const Snippet: React.FC<SnippetProps> = ({ snippet, sectionId, onRemove, onUpdateContent, onImprove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: snippet.id,
    data: {
      type: 'snippet',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group p-3 mb-2 bg-white border border-slate-300 rounded-md shadow-sm flex items-start"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400 mr-3 mt-1.5 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </div>
      <div className="flex-grow">
        <EditableText
            initialValue={snippet.content}
            onSave={(newContent) => onUpdateContent(sectionId, snippet.id, newContent)}
            className="text-slate-800 cursor-pointer"
            inputClassName="w-full border-b-2 border-blue-500 focus:outline-none bg-yellow-50"
            isTextarea={true}
            renderMarkdown
            markdownClassName="text-slate-800 whitespace-pre-wrap leading-relaxed"
        />
      </div>
      <div className={`absolute top-1/2 -translate-y-1/2 right-2 flex items-center space-x-2 transition-opacity duration-200 ${isHovered || isDragging ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => onImprove(sectionId, snippet.id, snippet.content)}
          className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
          title="Improve with AI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(sectionId, snippet.id)}
          className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
          title="Remove Snippet"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
