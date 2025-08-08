'use client';

import { Artifact } from '../types';

interface SvgRendererProps {
  artifact: Artifact;
}

export default function SvgRenderer({ artifact }: SvgRendererProps) {
  return (
    <div 
      className="w-full h-full flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900"
    >
      <div 
        className="max-w-full max-h-full"
        dangerouslySetInnerHTML={{ __html: artifact.content }}
      />
    </div>
  );
}