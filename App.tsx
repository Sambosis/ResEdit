import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Sidebar } from './components/Sidebar';
import { ResumeEditor } from './components/ResumeEditor';
import { Snippet, Section, SnippetBankSection } from './types';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer, toast } from 'react-toastify';
import { improveSnippetWithAI, parseResumeWithAI } from './services/geminiService';
import type { ParsedResumeSection } from './services/geminiService';
import { HEADER_SECTION_TITLE, isHeaderSectionTitle, normalizeSectionTitle } from './utils/sections';
import { exportResume, EXPORT_FORMATS, ExportFormat } from './services/exportService';

const initialResumeState: Section[] = [
  {
    id: 'section-1',
    title: 'Work Experience',
    snippets: [
      { id: 'snippet-1', content: 'Developed and maintained web applications using React and TypeScript.' },
    ],
  },
  {
    id: 'section-2',
    title: 'Education',
    snippets: [{ id: 'snippet-2', content: 'B.S. in Computer Science, University of Technology' }],
  },
];

const sanitizeSnippetContent = (content: string): string =>
  (content ?? '').replace(/\r/g, '').trim();

const createSnippetFingerprint = (content: string): string =>
  sanitizeSnippetContent(content).replace(/\s+/g, ' ').toLowerCase();

const formatSectionTitle = (title: string): string => {
  const trimmed = (title ?? '').trim();

  if (!trimmed) {
    return 'General';
  }

  if (isHeaderSectionTitle(trimmed)) {
    return HEADER_SECTION_TITLE;
  }

  return trimmed.replace(/\s+/g, ' ');
};

const mergeSectionsIntoSnippetBank = (
  currentBank: SnippetBankSection[],
  parsedSections: ParsedResumeSection[],
): SnippetBankSection[] => {
  if (!parsedSections || parsedSections.length === 0) {
    return currentBank.map(section => ({
      title: formatSectionTitle(section.title),
      snippets: section.snippets.map(snippet => ({ ...snippet })),
    }));
  }

  const mergedBank = currentBank.map(section => ({
    title: formatSectionTitle(section.title),
    snippets: section.snippets.map(snippet => ({ ...snippet })),
  }));

  const sectionMap = new Map<string, SnippetBankSection>();
  const fingerprintMap = new Map<string, Set<string>>();

  mergedBank.forEach(section => {
    const normalizedTitle = normalizeSectionTitle(section.title);
    sectionMap.set(normalizedTitle, section);
    fingerprintMap.set(
      normalizedTitle,
      new Set(section.snippets.map(snippet => createSnippetFingerprint(snippet.content))),
    );
  });

  parsedSections.forEach(parsedSection => {
    const formattedTitle = formatSectionTitle(parsedSection.title);
    const normalizedTitle = normalizeSectionTitle(formattedTitle);
    let bankSection = sectionMap.get(normalizedTitle);
    let fingerprints = bankSection ? fingerprintMap.get(normalizedTitle) : undefined;

    const snippets = Array.isArray(parsedSection.snippets) ? parsedSection.snippets : [];

    snippets.forEach(snippetText => {
      const sanitizedContent = sanitizeSnippetContent(snippetText);
      if (!sanitizedContent) {
        return;
      }

      const fingerprint = createSnippetFingerprint(sanitizedContent);

      if (fingerprints && fingerprints.has(fingerprint)) {
        return;
      }

      if (!bankSection) {
        bankSection = {
          title: formattedTitle,
          snippets: [],
        };
        sectionMap.set(normalizedTitle, bankSection);
        fingerprints = new Set<string>();
        fingerprintMap.set(normalizedTitle, fingerprints);
        if (isHeaderSectionTitle(formattedTitle)) {
          mergedBank.unshift(bankSection);
        } else {
          mergedBank.push(bankSection);
        }
      }

      const activeFingerprints = fingerprintMap.get(normalizedTitle);
      if (!activeFingerprints) {
        return;
      }

      if (activeFingerprints.has(fingerprint)) {
        return;
      }

      bankSection!.snippets.push({
        id: `bank-${uuidv4()}`,
        content: sanitizedContent,
      });
      activeFingerprints.add(fingerprint);
    });
  });

  const headerSections = mergedBank.filter(section => isHeaderSectionTitle(section.title));
  const otherSections = mergedBank.filter(section => !isHeaderSectionTitle(section.title));

  return [...headerSections, ...otherSections];
};

const App: React.FC = () => {
  const [resumeSections, setResumeSections] = useState<Section[]>(initialResumeState);
  const [snippetBank, setSnippetBank] = useState<SnippetBankSection[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleFileUpload = async (file: File) => {
    if (!file) {
      toast.error('Please select a file.');
      return;
    }
    setIsLoading(true);
    toast.info('Parsing resume with AI...');
    try {
      const text = await file.text();
      if (!text || !text.trim()) {
        toast.error('The selected file is empty.');
        return;
      }

      const parsedSections = await parseResumeWithAI(text);
      setSnippetBank(prevBank => mergeSectionsIntoSnippetBank(prevBank, parsedSections));
      toast.success('Resume parsed successfully!');
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast.error('Failed to parse resume.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setResumeSections(prev =>
      prev.map(section =>
        section.id === sectionId ? { ...section, title: newTitle } : section
      )
    );
  };

  const updateSnippetContent = (sectionId: string, snippetId: string, newContent: string) => {
    setResumeSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              snippets: section.snippets.map(snippet =>
                snippet.id === snippetId ? { ...snippet, content: newContent } : snippet
              ),
            }
          : section
      )
    );
  };
  
  const improveSnippet = async (sectionId: string, snippetId: string, content: string) => {
    setIsLoading(true);
    toast.info('AI is improving your snippet...');
    try {
        const suggestions = await improveSnippetWithAI(content);
        if (suggestions && suggestions.length > 0) {
            // For simplicity, we'll take the first suggestion. A real app might show a modal to choose.
            updateSnippetContent(sectionId, snippetId, suggestions[0]);
            toast.success('Snippet improved!');
        } else {
            toast.warn('AI could not generate suggestions.');
        }
    } catch (error) {
        console.error("Failed to improve snippet:", error);
        toast.error('Error improving snippet.');
    } finally {
        setIsLoading(false);
    }
  };

  const addSnippetFromBankToResume = (snippet: Snippet, sourceSectionTitle: string) => {
    const sanitizedContent = sanitizeSnippetContent(snippet.content);
    if (!sanitizedContent) {
      return;
    }

    const formattedTitle = formatSectionTitle(sourceSectionTitle);
    const normalizedTitle = normalizeSectionTitle(formattedTitle);
    const snippetFingerprint = createSnippetFingerprint(sanitizedContent);

    setResumeSections(prevSections => {
      const targetSection = prevSections.find(section => {
        const normalizedSectionTitle = normalizeSectionTitle(section.title);
        return (
          normalizedSectionTitle === normalizedTitle ||
          (isHeaderSectionTitle(section.title) && isHeaderSectionTitle(formattedTitle))
        );
      });

      if (targetSection) {
        const hasSnippet = targetSection.snippets.some(
          existing => createSnippetFingerprint(existing.content) === snippetFingerprint,
        );

        if (hasSnippet) {
          return prevSections;
        }

        return prevSections.map(section =>
          section.id === targetSection.id
            ? {
                ...section,
                snippets: [
                  ...section.snippets,
                  { id: `snippet-${uuidv4()}`, content: sanitizedContent },
                ],
              }
            : section,
        );
      }

      const newSection: Section = {
        id: `section-${uuidv4()}`,
        title: formattedTitle,
        snippets: [{ id: `snippet-${uuidv4()}`, content: sanitizedContent }],
      };

      if (isHeaderSectionTitle(formattedTitle)) {
        return [newSection, ...prevSections];
      }

      return [...prevSections, newSection];
    });
  };

  const findSectionAndSnippet = (id: string): { sectionId: string; snippetId: string } | { sectionId: string; snippetId: null } | null => {
    for (const section of resumeSections) {
      if (section.id === id) {
        return { sectionId: section.id, snippetId: null };
      }
      for (const snippet of section.snippets) {
        if (snippet.id === id) {
          return { sectionId: section.id, snippetId: snippet.id };
        }
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const isActiveASnippet = active.data.current?.type === 'snippet';
    const isOverASection = over.data.current?.type === 'section';

    if (isActiveASnippet && isOverASection) {
      setResumeSections(prevSections => {
        const activeSectionIdx = prevSections.findIndex(s => s.snippets.some(snip => snip.id === active.id));
        const overSectionIdx = prevSections.findIndex(s => s.id === over.id);

        if (activeSectionIdx !== -1 && overSectionIdx !== -1 && activeSectionIdx !== overSectionIdx) {
            const newSections = [...prevSections];
            const activeSection = newSections[activeSectionIdx];
            const overSection = newSections[overSectionIdx];
            
            const snippetIdx = activeSection.snippets.findIndex(s => s.id === active.id);
            const [movedSnippet] = activeSection.snippets.splice(snippetIdx, 1);
            
            overSection.snippets.push(movedSnippet);
            return newSections;
        }
        return prevSections;
      });
    }
  };


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
  
    if (!over) return;
  
    // Type guards
    const isActiveFromBank = active.data.current?.source === 'bank';
    const isOverEditor = over.data.current?.type === 'section' || over.data.current?.type === 'snippet' || over.id === 'resume-editor-droppable';
    const isActiveASection = active.data.current?.type === 'section';
    const isActiveASnippet = active.data.current?.type === 'snippet';
    const isOverASnippet = over.data.current?.type === 'snippet';
    const isOverEditorSection = over.data.current?.type === 'section';

    // Scenario 1: Dragging a snippet from the bank into the resume editor area
    if (isActiveFromBank && isOverEditor) {
        const { snippet, sectionTitle } = active.data.current as { snippet: Snippet, sectionTitle: string };
        if (snippet && sectionTitle) {
          addSnippetFromBankToResume(snippet, sectionTitle);
        }
        return;
    }

    // Scenario 2: Reordering sections within the editor
    if (isActiveASection && over.data.current?.type === 'section') {
        if (active.id !== over.id) {
            const activeIndex = resumeSections.findIndex(s => s.id === active.id);
            const overIndex = resumeSections.findIndex(s => s.id === over.id);
            if (activeIndex !== -1 && overIndex !== -1) {
                setResumeSections(sections => arrayMove(sections, activeIndex, overIndex));
            }
        }
        return;
    }
    
    // Scenario 3: Reordering snippets within or between sections
    if (isActiveASnippet && (isOverASnippet || isOverEditorSection)) {
        const { sectionId: activeSectionId } = findSectionAndSnippet(active.id as string) || {};
        
        let overSectionId: string | null = null;
        if (isOverASnippet) {
          overSectionId = (findSectionAndSnippet(over.id as string) || {}).sectionId || null;
        } else if (isOverEditorSection) {
          overSectionId = over.id as string;
        }
        
        if (!activeSectionId || !overSectionId) return;

        const activeSectionIndex = resumeSections.findIndex(s => s.id === activeSectionId);
        const overSectionIndex = resumeSections.findIndex(s => s.id === overSectionId);
        
        if (activeSectionIndex === -1 || overSectionIndex === -1) return;

        const activeSnippetIndex = resumeSections[activeSectionIndex].snippets.findIndex(s => s.id === active.id);
        
        let overSnippetIndex: number;
        if(isOverASnippet) {
           overSnippetIndex = resumeSections[overSectionIndex].snippets.findIndex(s => s.id === over.id);
        } else { // Dropped on section, add to end
           overSnippetIndex = resumeSections[overSectionIndex].snippets.length;
        }

        setResumeSections(prev => {
            const newSections = JSON.parse(JSON.stringify(prev)); // Deep copy
            const [movedSnippet] = newSections[activeSectionIndex].snippets.splice(activeSnippetIndex, 1);
            
            newSections[overSectionIndex].snippets.splice(overSnippetIndex, 0, movedSnippet);
            return newSections;
        });
    }
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section-${uuidv4()}`,
      title: 'New Section',
      snippets: [],
    };
    setResumeSections(prev => [...prev, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setResumeSections(prev => prev.filter(section => section.id !== sectionId));
  };

  const removeSnippet = (sectionId: string, snippetId: string) => {
    setResumeSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return { ...section, snippets: section.snippets.filter(s => s.id !== snippetId) };
      }
      return section;
    }));
  };

  const handleExportResume = (format: ExportFormat) => {
    try {
      const option = exportResume(resumeSections, format);
      toast.success(`Resume exported as ${option.label}.`);
    } catch (error) {
      console.error('Error exporting resume:', error);
      const message = error instanceof Error ? error.message : 'Failed to export resume.';
      if (message === 'Cannot export an empty resume.') {
        toast.info(message);
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex h-screen font-sans bg-slate-50 text-slate-800">
        <Sidebar 
          snippetBank={snippetBank} 
          onFileUpload={handleFileUpload} 
          isLoading={isLoading}
          onAddSnippet={addSnippetFromBankToResume}
        />
        <main className="flex-1 p-8 overflow-y-auto">
          <ResumeEditor
            sections={resumeSections}
            onAddSection={addSection}
            onRemoveSection={removeSection}
            onRemoveSnippet={removeSnippet}
            onUpdateSectionTitle={updateSectionTitle}
            onUpdateSnippetContent={updateSnippetContent}
            onImproveSnippet={improveSnippet}
            activeDragId={activeDragId}
            onExportResume={handleExportResume}
            exportFormats={EXPORT_FORMATS}
          />
        </main>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
    </DndContext>
  );
};

export default App;