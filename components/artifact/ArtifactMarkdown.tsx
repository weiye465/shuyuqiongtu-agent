'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Markdown } from '@/components/markdown';
import { ArtifactCard } from './ArtifactCard';
import { useArtifactSafe } from './ArtifactProvider';
import { useArtifactParser } from './hooks/useArtifactParser';

interface ArtifactMarkdownProps {
  content: string;
  className?: string;
}

export function ArtifactMarkdown({ content, className }: ArtifactMarkdownProps) {
  const artifactContext = useArtifactSafe();
  const { parseArtifactTags } = useArtifactParser();
  const firstArtifactIdRef = useRef<string | null>(null);
  
  // If not in ArtifactProvider, just render plain Markdown
  if (!artifactContext) {
    return <Markdown>{content}</Markdown>;
  }
  
  const { createArtifact, getArtifact, setActiveArtifact, activeArtifact } = artifactContext;
  
  // Parse artifacts and get modified content
  const { processedContent, artifactElements, artifacts } = useMemo(() => {
    const { content: modifiedContent, artifacts } = parseArtifactTags(content);
    
    // Store artifacts in the provider
    artifacts.forEach(artifact => {
      createArtifact(artifact);
    });
    
    // Remember the first artifact ID
    if (artifacts.length > 0) {
      firstArtifactIdRef.current = artifacts[0].id;
    }
    
    // Split content by placeholders and create elements
    const parts = modifiedContent.split(/(__ARTIFACT_PLACEHOLDER_[^_]+__)/g);
    const elements: (string | JSX.Element)[] = [];
    
    parts.forEach((part, index) => {
      if (part.startsWith('__ARTIFACT_PLACEHOLDER_')) {
        const artifactId = part.replace(/__ARTIFACT_PLACEHOLDER_|__/g, '');
        const artifact = artifacts.find(a => a.id === artifactId);
        if (artifact) {
          elements.push(
            <div key={`artifact-${index}`} className="my-3">
              <ArtifactCard artifact={artifact} />
            </div>
          );
        } else {
          elements.push(part);
        }
      } else if (part.trim()) {
        elements.push(
          <div key={`content-${index}`}>
            <Markdown>{part}</Markdown>
          </div>
        );
      }
    });
    
    return {
      processedContent: modifiedContent,
      artifactElements: elements,
      artifacts
    };
  }, [content, createArtifact]);
  
  // Auto-activate the first artifact when it's created
  useEffect(() => {
    if (artifacts.length > 0 && !activeArtifact) {
      setActiveArtifact(artifacts[0].id);
    }
  }, [artifacts, activeArtifact, setActiveArtifact]);
  
  return (
    <div className={className}>
      {artifactElements}
    </div>
  );
}