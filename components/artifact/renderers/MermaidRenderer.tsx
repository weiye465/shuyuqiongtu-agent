'use client';

import { useEffect, useRef, useState } from 'react';
import { Artifact } from '../types';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  artifact: Artifact;
}

export default function MermaidRenderer({ artifact }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const renderAttempts = useRef(0);
  
  useEffect(() => {
    console.log('[MermaidRenderer] Component mounted/updated', {
      artifactId: artifact.id,
      artifactType: artifact.type,
      contentLength: artifact.content?.length,
      contentPreview: artifact.content?.substring(0, 100)
    });
    
    const renderMermaid = async () => {
      console.log('[MermaidRenderer] Starting render process, attempt:', renderAttempts.current + 1);
      
      // Wait for DOM to be ready
      if (!containerRef.current) {
        console.warn('[MermaidRenderer] Container ref is null, waiting for DOM...');
        
        // Retry after a short delay if ref is not ready
        if (renderAttempts.current < 5) {
          renderAttempts.current++;
          setTimeout(() => {
            renderMermaid();
          }, 100);
          return;
        } else {
          console.error('[MermaidRenderer] Failed to get container ref after 5 attempts');
          setError('Failed to initialize container');
          return;
        }
      }
      
      try {
        setError(null);
        
        console.log('[MermaidRenderer] Container ref is ready, initializing mermaid');
        
        // Initialize mermaid
        mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#fff',
            primaryBorderColor: '#2563eb',
            lineColor: '#6b7280',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#e5e7eb'
          }
        });
        
        console.log('[MermaidRenderer] Mermaid initialized successfully');
        
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('[MermaidRenderer] Generated diagram ID:', id);
        
        // Log the content being rendered
        console.log('[MermaidRenderer] Rendering content:', artifact.content);
        
        // Render the diagram
        console.log('[MermaidRenderer] Calling mermaid.render()');
        const { svg } = await mermaid.render(id, artifact.content);
        
        console.log('[MermaidRenderer] Render successful, SVG length:', svg?.length);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          console.log('[MermaidRenderer] SVG inserted into DOM');
        } else {
          console.warn('[MermaidRenderer] Container ref became null after render');
        }
        
        renderAttempts.current = 0; // Reset attempts on success
        setRendered(true);
      } catch (err: any) {
        console.error('[MermaidRenderer] Render failed with error:', {
          message: err?.message,
          stack: err?.stack,
          error: err
        });
        setError(err?.message || 'Failed to render diagram');
        
        // Show the raw content as fallback
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre style="padding: 1rem; overflow: auto;">${artifact.content}</pre>`;
          console.log('[MermaidRenderer] Fallback content displayed');
        }
      } finally {
        console.log('[MermaidRenderer] Render process completed');
      }
    };
    
    // Start render with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      renderMermaid();
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      renderAttempts.current = 0;
    };
  }, [artifact.content, artifact.id]);
  
  return (
    <div className="w-full h-[600px] overflow-auto">
      <div className="w-full h-full flex items-center justify-center p-8">
        {error ? (
          <div className="text-center">
            <p className="text-red-500 mb-2">Error rendering diagram</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        ) : !rendered ? (
          <div className="text-gray-500">Loading diagram...</div>
        ) : null}
        <div 
          ref={containerRef} 
          className="mermaid-container w-full h-full"
          style={{ display: rendered || error ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}