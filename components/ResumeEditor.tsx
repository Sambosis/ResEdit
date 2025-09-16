
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Section as SectionType } from '../types';
import { Section } from './Section';
import {
  resumeExportFormats,
  ResumeExportFormat,
  hasExportableContent,
} from '../services/exportService';

interface ResumeEditorProps {
  sections: SectionType[];
  onAddSection: () => void;
  onRemoveSection: (sectionId: string) => void;
  onRemoveSnippet: (sectionId: string, snippetId: string) => void;
  onUpdateSectionTitle: (sectionId: string, newTitle: string) => void;
  onUpdateSnippetContent: (sectionId: string, snippetId: string, newContent: string) => void;
  onImproveSnippet: (sectionId: string, snippetId: string, content: string) => void;
  activeDragId: string | null;
  onExport: (format: ResumeExportFormat) => void;
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
  onExport,
}) => {
  const { setNodeRef } = useDroppable({
    id: 'resume-editor-droppable',
  });

  const sectionIds = sections.map(s => s.id);
  const isDraggingSection = activeDragId && activeDragId.startsWith('section-');
  const [selectedFormat, setSelectedFormat] = useState<ResumeExportFormat>('md');
  const canExport = hasExportableContent(sections);

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(event.target.value as ResumeExportFormat);
  };

  const handleExportClick = () => {
    onExport(selectedFormat);
  };

  return (
    <div className="bg-white p-12 rounded-lg shadow-lg max-w-4xl mx-auto min-h-full">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-10 border-b pb-6 border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800">Your Resume</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="resume-export-format" className="text-sm font-medium text-slate-600">
              Export as
            </label>
            <select
              id="resume-export-format"
              value={selectedFormat}
              onChange={handleFormatChange}
              className="border border-slate-300 rounded-lg py-2 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {resumeExportFormats.map(option => (
                <option key={option.value} value={option.value} title={option.description}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleExportClick}
            disabled={!canExport}
            className={`flex items-center font-semibold py-2 px-4 rounded-lg transition-colors ${
              canExport
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            title={canExport ? undefined : 'Add content to your resume before exporting.'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 3a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V3zm11 0H6v4h8V3zm-8 6a1 1 0 000 2h2v4a1 1 0 002 0v-4h2a1 1 0 100-2H6z" />
            </svg>
            Export Resume
          </button>
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
