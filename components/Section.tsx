
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Section as SectionType } from '../types';
import { Snippet } from './Snippet';
import { EditableText } from './EditableText';

interface SectionProps {
  section: SectionType;
  onRemoveSection: (sectionId: string) => void;
  onRemoveSnippet: (sectionId: string, snippetId: string) => void;
  onUpdateTitle: (sectionId: string, newTitle: string) => void;
  onUpdateSnippetContent: (sectionId: string, snippetId: string, newContent: string) => void;
  onImproveSnippet: (sectionId: string, snippetId: string, content: string) => void;
  activeDragId: string | null;
}

export const Section: React.FC<SectionProps> = ({
  section,
  onRemoveSection,
  onRemoveSnippet,
  onUpdateTitle,
  onUpdateSnippetContent,
  onImproveSnippet,
  activeDragId,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: {
      type: 'section',
    },
  });

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: 'section',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
  };

  const snippetIds = section.snippets.map(s => s.id);
  const isDraggingSnippetOver = isOver && activeDragId && (activeDragId.startsWith('snippet-') || activeDragId.startsWith('bank-'));

  return (
    <div ref={setNodeRef} style={style} className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex justify-between items-center mb-4" {...attributes} {...listeners}>
        <EditableText
          initialValue={section.title}
          onSave={(newTitle) => onUpdateTitle(section.id, newTitle)}
          className="text-2xl font-semibold text-slate-700 cursor-pointer"
          inputClassName="text-2xl font-semibold border-b-2 border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => onRemoveSection(section.id)}
          className="text-slate-400 hover:text-red-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div 
        ref={setDroppableNodeRef} 
        className={`min-h-[60px] p-2 rounded-md transition-colors duration-300 ${isDraggingSnippetOver ? 'bg-blue-100 border-2 border-dashed border-blue-400' : 'bg-transparent'}`}
      >
        <SortableContext items={snippetIds} strategy={verticalListSortingStrategy}>
          {section.snippets.map(snippet => (
            <Snippet
              key={snippet.id}
              snippet={snippet}
              sectionId={section.id}
              onRemove={onRemoveSnippet}
              onUpdateContent={onUpdateSnippetContent}
              onImprove={onImproveSnippet}
            />
          ))}
          {section.snippets.length === 0 && !isDraggingSnippetOver && (
            <p className="text-slate-400 text-center py-4">Drag snippets here</p>
          )}
        </SortableContext>
      </div>

      {section.subsections && section.subsections.length > 0 && (
        <div className="ml-8 mt-4 border-l-2 border-slate-200 pl-6">
          <SortableContext items={section.subsections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {section.subsections.map(subSection => (
              <Section
                key={subSection.id}
                section={subSection}
                onRemoveSection={onRemoveSection}
                onRemoveSnippet={onRemoveSnippet}
                onUpdateTitle={onUpdateTitle}
                onUpdateSnippetContent={onUpdateSnippetContent}
                onImproveSnippet={onImproveSnippet}
                activeDragId={activeDragId}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
};
