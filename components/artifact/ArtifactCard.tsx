'use client';

import { Artifact } from './types';
import { useArtifact } from './ArtifactProvider';
import { Check, Loader2, FileCode, FileText, Code, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtifactCardProps {
  artifact: Artifact;
  className?: string;
}

export function ArtifactCard({ artifact, className }: ArtifactCardProps) {
  const { setActiveArtifact, activeArtifact } = useArtifact();
  const isActive = activeArtifact?.id === artifact.id;

  const getIcon = () => {
    switch (artifact.type) {
      case 'application/vnd.ant.code':
        return <FileCode className="w-4 h-4" />;
      case 'text/html':
        return <Code className="w-4 h-4" />;
      case 'text/markdown':
        return <FileText className="w-4 h-4" />;
      case 'image/svg+xml':
      case 'application/vnd.ant.mermaid':
        return <Image className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  return (
    <div
      onClick={() => setActiveArtifact(isActive ? null : artifact.id)}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
        "hover:shadow-md",
        isActive 
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md hover:border-blue-600" 
          : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:border-blue-400",
        className
      )}
      title={isActive ? "Click to close preview" : "Click to preview"}
    >
      <div className="flex items-center gap-2 flex-1">
        {getIcon()}
        <span className="text-sm font-medium truncate max-w-[200px]">
          {artifact.title}
        </span>
      </div>
      
      {artifact.closed ? (
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
      )}
    </div>
  );
}