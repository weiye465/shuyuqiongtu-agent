'use client';

import { useEffect, useRef, useState } from 'react';
import { Artifact } from '../types';

interface HtmlRendererProps {
  artifact: Artifact;
}

export default function HtmlRenderer({ artifact }: HtmlRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const retryCount = useRef(0);
  const hasWritten = useRef(false);
  const lastContentHash = useRef<string>('');
  
  // Simple hash function to detect content changes
  const getContentHash = (content: string) => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };
  
  useEffect(() => {
    const contentHash = getContentHash(artifact.content);
    const isContentChanged = contentHash !== lastContentHash.current;
    
    console.log('[HtmlRenderer] useEffect triggered', {
      artifactId: artifact.id,
      contentLength: artifact.content?.length,
      iframeExists: !!iframeRef.current,
      iframeKey: iframeKey,
      contentChanged: isContentChanged,
      hasWritten: hasWritten.current
    });
    
    // Skip if content hasn't changed and already written
    if (!isContentChanged && hasWritten.current) {
      console.log('[HtmlRenderer] Content unchanged, skipping write');
      return;
    }
    
    // Reset flags for new content
    hasWritten.current = false;
    lastContentHash.current = contentHash;
    
    const writeContent = () => {
      console.log('[HtmlRenderer] writeContent called, retry:', retryCount.current);
      
      // Check if already written successfully
      if (hasWritten.current) {
        console.log('[HtmlRenderer] Content already written, skipping');
        return true;
      }
      
      if (!iframeRef.current) {
        console.warn('[HtmlRenderer] iframe ref is null');
        return false;
      }
      
      console.log('[HtmlRenderer] iframe ref exists, checking contentDocument...');
      
      try {
        const doc = iframeRef.current.contentDocument;
        const win = iframeRef.current.contentWindow;
        
        console.log('[HtmlRenderer] iframe state:', {
          contentDocument: !!doc,
          contentWindow: !!win,
          readyState: iframeRef.current?.contentDocument?.readyState
        });
        
        if (!doc) {
          console.warn('[HtmlRenderer] iframe contentDocument is null, will retry...');
          return false;
        }
        
        console.log('[HtmlRenderer] Writing content to iframe, length:', artifact.content?.length);
    
    // Check if content already has DOCTYPE and HTML structure
    const hasHtmlStructure = artifact.content.trim().toLowerCase().startsWith('<!doctype') || 
                           artifact.content.trim().toLowerCase().startsWith('<html');
    
    let finalContent = '';
    
    if (hasHtmlStructure) {
      // Content already has full HTML structure, use it directly
      // But still need to filter potentially unsafe sources
      finalContent = artifact.content.replace(/src="[^"]*"/g, (match) => {
        // Whitelist certain sources
        if (match.includes('cdn.tailwindcss.com')) return match;
        if (match.includes('cdnjs.cloudflare.com')) return match;
        if (match.includes('cdn.jsdelivr.net')) return match;
        if (match.includes('/api/placeholder/')) return match;
        // Block other external sources
        return 'src=""';
      });
    } else {
      // Wrap partial HTML in a complete document
      finalContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                overflow-x: auto;
                overflow-y: auto;
              }
              body {
                max-width: 100%;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              pre {
                overflow-x: auto;
                max-width: 100%;
              }
              img, video, iframe {
                max-width: 100%;
                height: auto;
              }
              table {
                max-width: 100%;
                overflow-x: auto;
                display: block;
              }
            </style>
          </head>
          <body>
            ${artifact.content}
          </body>
        </html>
      `;
    }
    
        // Clear the document before writing
        doc.open();
        doc.write(finalContent);
        doc.close();
        
        console.log('[HtmlRenderer] Content written successfully');
        hasWritten.current = true; // Mark as written
        retryCount.current = 0; // Reset retry count on success
        return true;
      } catch (error) {
        console.error('[HtmlRenderer] Error writing to iframe:', error);
        return false;
      }
    };
    
    // Function to retry writing content
    const attemptWrite = () => {
      const success = writeContent();
      
      if (!success && retryCount.current < 10) {
        retryCount.current++;
        console.log('[HtmlRenderer] Scheduling retry', retryCount.current);
        setTimeout(attemptWrite, 100);
      } else if (retryCount.current >= 10) {
        console.error('[HtmlRenderer] Failed after 10 retries');
        // Force recreate iframe
        setIframeKey(prev => prev + 1);
        retryCount.current = 0;
      }
    };
    
    // Setup iframe onload handler only once
    const setupIframeHandler = () => {
      if (iframeRef.current && !iframeRef.current.onload) {
        console.log('[HtmlRenderer] Setting up iframe onload handler');
        iframeRef.current.onload = () => {
          console.log('[HtmlRenderer] iframe onload fired');
          // Only write if not already written
          if (!hasWritten.current) {
            setTimeout(() => {
              writeContent();
            }, 50);
          }
        };
      }
    };
    
    setupIframeHandler();
    
    // Start attempting to write content
    const timeoutId = setTimeout(() => {
      if (!hasWritten.current) {
        attemptWrite();
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      retryCount.current = 0;
    };
  }, [artifact.content, artifact.id, iframeKey]);
  
  console.log('[HtmlRenderer] Rendering iframe with key:', iframeKey);
  
  return (
    <div className="w-full h-[600px] overflow-hidden relative">
      <iframe
        key={iframeKey}
        ref={iframeRef}
        className="absolute inset-0 w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin"
        title={artifact.title}
        style={{ maxWidth: '100%' }}
        srcDoc=""
        onError={(e) => {
          console.error('[HtmlRenderer] iframe error:', e);
        }}
      />
    </div>
  );
}