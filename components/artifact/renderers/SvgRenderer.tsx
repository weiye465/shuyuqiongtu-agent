'use client';

import { useEffect, useRef } from 'react';
import { Artifact } from '../types';

interface SvgRendererProps {
  artifact: Artifact;
}

export default function SvgRenderer({ artifact }: SvgRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      // Find all SVG elements and make them responsive
      const svgElements = containerRef.current.querySelectorAll('svg');
      svgElements.forEach((svg) => {
        // Remove width/height attributes to make SVG responsive
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        // Set viewBox if not present (try to get from original width/height)
        if (!svg.getAttribute('viewBox')) {
          const width = svg.getAttribute('width') || '100';
          const height = svg.getAttribute('height') || '100';
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        // Make SVG fill container
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';
      });
    }
  }, [artifact.content]);
  
  return (
    <div className="w-full h-[600px] overflow-auto bg-gray-50 dark:bg-gray-900">
      <div 
        ref={containerRef}
        className="w-full h-full p-4"
        dangerouslySetInnerHTML={{ __html: artifact.content }}
      />
    </div>
  );
}