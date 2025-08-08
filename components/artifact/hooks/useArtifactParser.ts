import { Artifact, ArtifactType, ParsedContent } from '../types';
import { createHash } from 'crypto';

export function useArtifactParser() {
  const generateId = () => {
    return `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateHash = (content: string) => {
    // Simple hash for browser environment
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };

  const parseAttributes = (attrString: string): Record<string, string> => {
    const attributes: Record<string, string> = {};
    const regex = /(\w+)="([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(attrString)) !== null) {
      attributes[match[1]] = match[2];
    }
    
    return attributes;
  };

  const parseArtifactTags = (content: string): ParsedContent => {
    const artifactRegex = /<antArtifact\s+([^>]+)>([\s\S]*?)<\/antArtifact>/g;
    const artifacts: Artifact[] = [];
    let modifiedContent = content;
    const placeholders: { original: string; placeholder: string; artifact: Artifact }[] = [];

    let match;
    while ((match = artifactRegex.exec(content)) !== null) {
      const attributes = parseAttributes(match[1]);
      const artifactContent = match[2].trim();
      
      const artifact: Artifact = {
        id: attributes.identifier || generateId(),
        hash: generateHash(artifactContent),
        type: (attributes.type as ArtifactType) || ArtifactType.CODE,
        title: attributes.title || 'Untitled',
        content: artifactContent,
        language: attributes.language,
        closed: attributes.closed === 'true',
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes
      };
      
      artifacts.push(artifact);
      
      // Create placeholder that will be replaced with the ArtifactCard component
      const placeholder = `__ARTIFACT_PLACEHOLDER_${artifact.id}__`;
      placeholders.push({
        original: match[0],
        placeholder,
        artifact
      });
    }

    // Replace all artifact tags with placeholders
    placeholders.forEach(({ original, placeholder }) => {
      modifiedContent = modifiedContent.replace(original, placeholder);
    });

    return { content: modifiedContent, artifacts };
  };

  const extractArtifactPlaceholders = (content: string): string[] => {
    const placeholderRegex = /__ARTIFACT_PLACEHOLDER_([^_]+)__/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = placeholderRegex.exec(content)) !== null) {
      placeholders.push(match[1]);
    }
    
    return placeholders;
  };

  return { 
    parseArtifactTags, 
    extractArtifactPlaceholders,
    generateId,
    generateHash 
  };
}