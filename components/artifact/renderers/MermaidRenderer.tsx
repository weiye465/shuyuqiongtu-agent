'use client';

import { useEffect, useRef, useState } from 'react';
import { Artifact } from '../types';

interface MermaidRendererProps {
  artifact: Artifact;
}

// Dynamically import mermaid to avoid SSR issues
let mermaidModule: any = null;

export default function MermaidRenderer({ artifact }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadMermaid = async () => {
      if (!mermaidModule) {
        try {
          mermaidModule = await import('mermaid');
          mermaidModule.default.initialize({ 
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'strict',
            themeVariables: {
              primaryColor: '#3b82f6',
              primaryTextColor: '#fff',
              primaryBorderColor: '#2563eb',
              lineColor: '#6b7280',
              secondaryColor: '#f3f4f6',
              tertiaryColor: '#e5e7eb'
            }
          });
        } catch (err) {
          setError('Failed to load Mermaid library');
          setLoading(false);
          return;
        }
      }

      if (!containerRef.current) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Generate unique ID for this diagram
        const id = `mermaid-${artifact.id}-${Date.now()}`;
        
        // Render the diagram
        const { svg } = await mermaidModule.default.render(id, artifact.content);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to render diagram');
      } finally {
        setLoading(false);
      }
    };
    
    loadMermaid();
  }, [artifact.content, artifact.id]);
  
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error rendering diagram</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-500">Loading diagram...</div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
      <div ref={containerRef} className="mermaid-container" />
    </div>
  );
}