'use client';

import { useState, lazy, Suspense } from 'react';
import { useArtifact } from './ArtifactProvider';
import { X, Copy, Check, Code, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArtifactType } from './types';

// Lazy load renderers for better performance
const renderers = {
  [ArtifactType.CODE]: lazy(() => import('./renderers/CodeRenderer')),
  [ArtifactType.HTML]: lazy(() => import('./renderers/HtmlRenderer')),
  [ArtifactType.MARKDOWN]: lazy(() => import('./renderers/MarkdownRenderer')),
  [ArtifactType.SVG]: lazy(() => import('./renderers/SvgRenderer')),
  [ArtifactType.MERMAID]: lazy(() => import('./renderers/MermaidRenderer'))
};

interface ArtifactPreviewProps {
  className?: string;
  onClose?: () => void;
}

export function ArtifactPreview({ className, onClose }: ArtifactPreviewProps) {
  const { activeArtifact, setActiveArtifact } = useArtifact();
  const [showCode, setShowCode] = useState(true);
  const [copied, setCopied] = useState(false);
  
  if (!activeArtifact) return null;
  
  const Renderer = renderers[activeArtifact.type];
  const canPreview = activeArtifact.type !== ArtifactType.CODE;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleClose = () => {
    setActiveArtifact(null);
    onClose?.();
  };
  
  const getLanguageDisplay = () => {
    if (activeArtifact.type === ArtifactType.CODE && activeArtifact.language) {
      return activeArtifact.language;
    }
    switch (activeArtifact.type) {
      case ArtifactType.HTML:
        return 'HTML';
      case ArtifactType.MARKDOWN:
        return 'Markdown';
      case ArtifactType.SVG:
        return 'SVG';
      case ArtifactType.MERMAID:
        return 'Mermaid';
      default:
        return 'Text';
    }
  };
  
  return (
    <div className={cn("flex flex-col h-full bg-background border-l", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate max-w-[200px]">
            {activeArtifact.title}
          </h3>
          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
            {getLanguageDisplay()}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {canPreview && (
            <div className="flex items-center rounded-md bg-muted p-1 mr-2">
              <Button
                variant={showCode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowCode(true)}
                className="h-7 px-2"
              >
                <Code className="w-3 h-3 mr-1" />
                Code
              </Button>
              <Button
                variant={!showCode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowCode(false)}
                className="h-7 px-2"
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        }>
          {(() => {
            const ComponentToRender = showCode || !canPreview 
              ? renderers[ArtifactType.CODE] 
              : Renderer;
            return <ComponentToRender artifact={activeArtifact} />;
          })()}
        </Suspense>
      </div>
    </div>
  );
}