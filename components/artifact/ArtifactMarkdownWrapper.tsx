'use client';

import React, { createContext, useContext } from 'react';
import { Markdown } from '@/components/markdown';
import { ArtifactMarkdown } from './ArtifactMarkdown';

// Create a context to check if we're inside an ArtifactProvider
const ArtifactEnabledContext = createContext(false);

export function useIsArtifactEnabled() {
  return useContext(ArtifactEnabledContext);
}

interface ArtifactMarkdownWrapperProps {
  content: string;
  className?: string;
}

export function ArtifactMarkdownWrapper({ content, className }: ArtifactMarkdownWrapperProps) {
  // Try to detect if we're in an artifact context
  // by checking if the content contains artifact tags
  const hasArtifactTags = content.includes('<antArtifact');
  
  if (!hasArtifactTags) {
    // No artifact tags, just render plain Markdown
    return <Markdown>{content}</Markdown>;
  }
  
  // Has artifact tags, try to use ArtifactMarkdown
  // This will work if we're in an ArtifactProvider
  try {
    return <ArtifactMarkdown content={content} className={className} />;
  } catch (e) {
    // Fallback to plain Markdown if not in provider
    return <Markdown>{content}</Markdown>;
  }
}