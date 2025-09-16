import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const combineClassNames = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(' ');

const markdownComponents: Components = {
  p: ({ className, ...props }) => (
    <p
      className={combineClassNames(className, 'mb-1 last:mb-0 whitespace-pre-wrap')}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={combineClassNames(className, 'list-disc ml-5 mb-1 last:mb-0')} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={combineClassNames(className, 'list-decimal ml-5 mb-1 last:mb-0')} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={combineClassNames(className, 'leading-snug mb-1 last:mb-0')} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={combineClassNames(className, 'text-base font-semibold mb-1')} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={combineClassNames(className, 'text-sm font-semibold mb-1')} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong className={combineClassNames(className, 'font-semibold')} {...props} />
  ),
  em: ({ className, ...props }) => (
    <em className={combineClassNames(className, 'italic')} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={combineClassNames(className, 'text-blue-600 underline')} {...props} />
  ),
  code: ({ className, ...props }) => (
    <code
      className={combineClassNames(className, 'font-mono text-xs bg-slate-200/60 px-1 rounded')}
      {...props}
    />
  ),
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className }) => {
  const markdownClassName = combineClassNames('text-sm text-slate-800 leading-snug', className);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
      className={markdownClassName}
    >
      {content || ''}
    </ReactMarkdown>
  );
};
