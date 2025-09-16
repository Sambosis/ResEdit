export const HEADER_SECTION_TITLE = 'Header';

const HEADER_ALIASES = [
  'header',
  'contact information',
  'contact info',
  'contact details',
];

export const normalizeSectionTitle = (title: string): string => {
  return (title || '').trim().toLowerCase();
};

export const isHeaderSectionTitle = (title: string): boolean => {
  const normalized = normalizeSectionTitle(title);
  return HEADER_ALIASES.includes(normalized);
};
