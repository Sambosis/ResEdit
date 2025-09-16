
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Section as SectionType } from '../types';
import { Section } from './Section';

interface ResumeEditorProps {
  sections: SectionType[];
  onAddSection: () => void;
  onRemoveSection: (sectionId: string) => void;
  onRemoveSnippet: (sectionId: string, snippetId: string) => void;
  onUpdateSectionTitle: (sectionId: string, newTitle: string) => void;
  onUpdateSnippetContent: (sectionId: string, snippetId: string, newContent: string) => void;
  onImproveSnippet: (sectionId: string, snippetId: string, content: string) => void;
  activeDragId: string | null;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({
  sections,
  onAddSection,
  onRemoveSection,
  onRemoveSnippet,
  onUpdateSectionTitle,
  onUpdateSnippetContent,
  onImproveSnippet,
  activeDragId,
}) => {
  const { setNodeRef } = useDroppable({
    id: 'resume-editor-droppable',
  });

  const sectionIds = sections.map(s => s.id);
  const isDraggingSection = activeDragId && activeDragId.startsWith('section-');

  return (
    <div className="bg-white p-12 rounded-lg shadow-lg max-w-4xl mx-auto min-h-full">
      <div className="flex justify-between items-center mb-10 border-b pb-6 border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800">Your Resume</h2>
        <button
          onClick={onAddSection}
          className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Section
        </button>
      </div>
      
      <div
        ref={setNodeRef}
        className={`min-h-[500px] transition-colors duration-300 ${isDraggingSection ? 'bg-slate-50' : ''}`}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <Section
              key={section.id}
              section={section}
              onRemoveSection={onRemoveSection}
              onRemoveSnippet={onRemoveSnippet}
              onUpdateTitle={onUpdateSectionTitle}
              onUpdateSnippetContent={onUpdateSnippetContent}
              onImproveSnippet={onImproveSnippet}
              activeDragId={activeDragId}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};
