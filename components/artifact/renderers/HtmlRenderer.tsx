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
    
    // Add viewport meta and base styles to prevent overflow
    const htmlWithStyles = `
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
          ${artifact.content
            .replace(/src="[^"]*"/g, (match) => {
              // Whitelist certain sources
              if (match.includes('cdnjs.cloudflare.com')) return match;
              if (match.includes('/api/placeholder/')) return match;
              // Block other external sources
              return 'src=""';
            })}
        </body>
      </html>
    `;
    
    doc.open();
    doc.write(htmlWithStyles);
    doc.close();
  }, [artifact.content]);
  
  return (
    <div className="w-full h-[600px] overflow-hidden relative">
      <iframe
        ref={iframeRef}
        className="absolute inset-0 w-full h-full border-0 bg-white"
        sandbox="allow-scripts"
        title={artifact.title}
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}