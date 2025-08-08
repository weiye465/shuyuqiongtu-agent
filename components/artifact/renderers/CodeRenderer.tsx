'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';
import { Artifact } from '../types';
import { useEffect, useRef } from 'react';

interface CodeRendererProps {
  artifact: Artifact;
}

export default function CodeRenderer({ artifact }: CodeRendererProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const codeStyle = theme === 'light' || theme === 'sunset' ? oneLight : tomorrow;
  
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
            backgroundColor: 'transparent',
            maxWidth: '100%',
            overflowX: 'auto',
            // 强制限制宽度
            display: 'block',
            boxSizing: 'border-box'
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