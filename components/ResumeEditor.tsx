
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ExportFormat, ExportOption, Section as SectionType } from '../types';
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
  onExportResume: (format: ExportFormat) => void;
  exportFormats: ExportOption[];
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
  onExportResume,
  exportFormats,
}) => {
  const { setNodeRef } = useDroppable({
    id: 'resume-editor-droppable',
  });

  const sectionIds = sections.map(s => s.id);
  const isDraggingSection = activeDragId && activeDragId.startsWith('section-');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    exportFormats[0]?.value ?? 'markdown'
  );

  const handleExportClick = () => {
    if (exportFormats.length === 0) {
      return;
    }
    onExportResume(selectedFormat);
  };

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(event.target.value as ExportFormat);
  };

  const exportSelectId = 'resume-export-format';
  const isExportDisabled = exportFormats.length === 0;

  return (
    <div className="bg-white p-12 rounded-lg shadow-lg max-w-4xl mx-auto min-h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10 border-b pb-6 border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800">Your Resume</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <label htmlFor={exportSelectId} className="text-sm font-medium text-slate-600">
              Export as
            </label>
            <select
              id={exportSelectId}
              value={selectedFormat}
              onChange={handleFormatChange}
              disabled={isExportDisabled}
              className="mt-1 sm:mt-0 border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {exportFormats.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={handleExportClick}
              disabled={isExportDisabled}
              className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              Export
            </button>
            <button
              onClick={onAddSection}
              className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Section
            </button>
          </div>
        </div>
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
