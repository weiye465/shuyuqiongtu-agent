'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Artifact } from '../types';
import { useEffect, useRef } from 'react';

interface CodeRendererProps {
  artifact: Artifact;
}

export default function CodeRenderer({ artifact }: CodeRendererProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const codeStyle = theme === 'light' || theme === 'sunset' ? oneLight : oneDark;
  
  // Log for debugging
  console.log('[CodeRenderer] Rendering code with:', {
    language: artifact.language || 'text',
    theme: theme,
    styleApplied: codeStyle ? 'yes' : 'no'
  });
  
  // 强制修复pre标签宽度问题
  useEffect(() => {
    if (containerRef.current) {
      const preElements = containerRef.current.querySelectorAll('pre');
      preElements.forEach((pre) => {
        (pre as HTMLElement).style.maxWidth = '100%';
        (pre as HTMLElement).style.overflowX = 'auto';
      });
    }
  }, [artifact.content]);
  
  return (
    <div className="w-full h-[600px] overflow-hidden relative">
      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-auto"
        style={{
          // 使用内联样式确保生效
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          contain: 'size'
        }}
      >
        <SyntaxHighlighter
          language={artifact.language || 'text'}
          style={codeStyle}
          customStyle={{
            margin: 0,
            padding: '1rem',
            minHeight: '100%',
            fontSize: '0.875rem',
            maxWidth: '100%',
            overflowX: 'auto',
            display: 'block',
            boxSizing: 'border-box',
            // Ensure background from theme is applied
            background: codeStyle?.['pre[class*="language-"]']?.background || '#1e1e1e'
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#6b7280',
            userSelect: 'none'
          }}
          // 禁用长行换行，使用滚动
          wrapLines={false}
          wrapLongLines={false}
        >
          {artifact.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}