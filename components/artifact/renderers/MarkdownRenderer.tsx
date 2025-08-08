'use client';

import { Markdown } from '@/components/markdown';
import { Artifact } from '../types';

interface MarkdownRendererProps {
  artifact: Artifact;
}

export default function MarkdownRenderer({ artifact }: MarkdownRendererProps) {
  return (
    <div className="w-full h-[600px] overflow-auto p-6 bg-white dark:bg-gray-950">
      <Markdown>{artifact.content}</Markdown>
    </div>
  );
}