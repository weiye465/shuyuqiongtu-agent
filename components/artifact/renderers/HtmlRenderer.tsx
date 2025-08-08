'use client';

import { useEffect, useRef } from 'react';
import { Artifact } from '../types';

interface HtmlRendererProps {
  artifact: Artifact;
}

export default function HtmlRenderer({ artifact }: HtmlRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (!iframeRef.current) return;
    
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    
    // Process HTML to ensure security
    const processedHtml = artifact.content
      .replace(/src="[^"]*"/g, (match) => {
        // Whitelist certain sources
        if (match.includes('cdnjs.cloudflare.com')) return match;
        if (match.includes('/api/placeholder/')) return match;
        // Block other external sources
        return 'src=""';
      });
    
    doc.open();
    doc.write(processedHtml);
    doc.close();
  }, [artifact.content]);
  
  return (
    <div className="w-full h-[600px] overflow-hidden">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts"
        title={artifact.title}
      />
    </div>
  );
}