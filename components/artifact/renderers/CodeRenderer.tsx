'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';
import { Artifact } from '../types';

interface CodeRendererProps {
  artifact: Artifact;
}

export default function CodeRenderer({ artifact }: CodeRendererProps) {
  const { theme } = useTheme();
  const codeStyle = theme === 'light' || theme === 'sunset' ? oneLight : tomorrow;
  
  return (
    <div className="w-full h-[600px] overflow-auto">
      <SyntaxHighlighter
        language={artifact.language || 'text'}
        style={codeStyle}
        customStyle={{
          margin: 0,
          padding: '1rem',
          minHeight: '100%',
          fontSize: '0.875rem',
          backgroundColor: 'transparent'
        }}
        showLineNumbers
      >
        {artifact.content}
      </SyntaxHighlighter>
    </div>
  );
}