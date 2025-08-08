# Artifact 系统实施方案 - Next.js 项目

## 一、系统概述

将 chatmcp 中的 Artifact 功能完整复刻到 Next.js 项目中，实现 AI 生成内容的可视化预览和交互。

## 二、核心功能特性

### 2.1 支持的内容类型
- **代码片段** (application/vnd.ant.code)
- **Markdown 文档** (text/markdown)  
- **HTML 页面** (text/html)
- **SVG 图形** (image/svg+xml)
- **Mermaid 图表** (application/vnd.ant.mermaid)

### 2.2 核心功能
- 智能识别 `<antArtifact>` 标签
- 实时代码预览
- HTML 沙箱环境执行
- 多内容切换管理
- 响应式布局

## 三、技术架构设计

### 3.1 组件架构

```
/components/artifact/
├── ArtifactProvider.tsx        # 状态管理上下文
├── ArtifactContainer.tsx       # 主容器组件
├── ArtifactCard.tsx           # 卡片展示组件
├── ArtifactPreview.tsx        # 预览面板组件
├── renderers/                 # 渲染器目录
│   ├── CodeRenderer.tsx       # 代码高亮渲染
│   ├── HtmlRenderer.tsx       # HTML 预览
│   ├── SvgRenderer.tsx        # SVG 渲染
│   ├── MermaidRenderer.tsx    # Mermaid 图表
│   └── MarkdownRenderer.tsx   # Markdown 渲染
├── hooks/                      # 自定义 Hooks
│   ├── useArtifact.ts         # Artifact 核心逻辑
│   ├── useArtifactParser.ts   # 标签解析
│   └── useSandbox.ts          # 沙箱管理
└── types.ts                   # 类型定义
```

### 3.2 数据流架构

```typescript
// types.ts
export interface Artifact {
  id: string;
  hash: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  closed: boolean;
  createdAt: Date;
  updatedAt: Date;
  attributes: Record<string, string>;
}

export enum ArtifactType {
  CODE = 'application/vnd.ant.code',
  MARKDOWN = 'text/markdown',
  HTML = 'text/html',
  SVG = 'image/svg+xml',
  MERMAID = 'application/vnd.ant.mermaid'
}

export interface ArtifactEvent {
  action: 'create' | 'update' | 'preview' | 'close';
  artifact: Artifact;
}
```

## 四、核心组件实现

### 4.1 ArtifactProvider 状态管理

```typescript
// components/artifact/ArtifactProvider.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ArtifactContextType {
  artifacts: Map<string, Artifact>;
  activeArtifact: Artifact | null;
  previewVisible: boolean;
  createArtifact: (artifact: Artifact) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  setActiveArtifact: (id: string | null) => void;
  togglePreview: (visible?: boolean) => void;
}

const ArtifactContext = createContext<ArtifactContextType | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState(new Map<string, Artifact>());
  const [activeArtifact, setActiveArtifactState] = useState<Artifact | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // 实现创建、更新、激活等方法
  // ...

  return (
    <ArtifactContext.Provider value={{
      artifacts,
      activeArtifact,
      previewVisible,
      createArtifact,
      updateArtifact,
      setActiveArtifact,
      togglePreview
    }}>
      {children}
    </ArtifactContext.Provider>
  );
}
```

### 4.2 Markdown 扩展集成

```typescript
// components/artifact/useArtifactParser.ts
export function useArtifactParser() {
  const parseArtifactTags = (content: string): ParsedContent => {
    const artifactRegex = /<antArtifact\s+([^>]+)>([\s\S]*?)<\/antArtifact>/g;
    const artifacts: Artifact[] = [];
    let modifiedContent = content;

    let match;
    while ((match = artifactRegex.exec(content)) !== null) {
      const attributes = parseAttributes(match[1]);
      const artifactContent = match[2];
      
      const artifact: Artifact = {
        id: attributes.identifier || generateId(),
        hash: generateHash(artifactContent),
        type: attributes.type as ArtifactType,
        title: attributes.title || 'Untitled',
        content: artifactContent,
        language: attributes.language,
        closed: attributes.closed === 'true',
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes
      };
      
      artifacts.push(artifact);
      
      // 替换为占位组件
      const placeholder = `<artifact-placeholder id="${artifact.id}" />`;
      modifiedContent = modifiedContent.replace(match[0], placeholder);
    }

    return { content: modifiedContent, artifacts };
  };

  return { parseArtifactTags };
}
```

### 4.3 预览面板组件

```typescript
// components/artifact/ArtifactPreview.tsx
import { useArtifact } from './hooks/useArtifact';
import dynamic from 'next/dynamic';

const renderers = {
  'application/vnd.ant.code': dynamic(() => import('./renderers/CodeRenderer')),
  'text/html': dynamic(() => import('./renderers/HtmlRenderer')),
  'text/markdown': dynamic(() => import('./renderers/MarkdownRenderer')),
  'image/svg+xml': dynamic(() => import('./renderers/SvgRenderer')),
  'application/vnd.ant.mermaid': dynamic(() => import('./renderers/MermaidRenderer'))
};

export function ArtifactPreview() {
  const { activeArtifact, previewVisible } = useArtifact();
  const [showCode, setShowCode] = useState(true);
  
  if (!activeArtifact || !previewVisible) return null;
  
  const Renderer = renderers[activeArtifact.type];
  
  return (
    <div className="artifact-preview">
      <div className="artifact-toolbar">
        <button onClick={() => setShowCode(true)}>Code</button>
        <button onClick={() => setShowCode(false)}>Preview</button>
        <button onClick={handleCopy}>Copy</button>
        <button onClick={handleClose}>Close</button>
      </div>
      
      <div className="artifact-content">
        {showCode ? (
          <CodeRenderer artifact={activeArtifact} />
        ) : (
          <Renderer artifact={activeArtifact} />
        )}
      </div>
    </div>
  );
}
```

## 五、沙箱环境实现

### 5.1 HTML 预览沙箱

```typescript
// components/artifact/renderers/HtmlRenderer.tsx
export default function HtmlRenderer({ artifact }: { artifact: Artifact }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (!iframeRef.current) return;
    
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    
    // 处理外部资源白名单
    const processedHtml = artifact.content
      .replace(/src="[^"]*"/g, (match) => {
        if (match.includes('cdnjs.cloudflare.com')) return match;
        if (match.includes('/api/placeholder/')) return match;
        return 'src=""';
      });
    
    doc.open();
    doc.write(processedHtml);
    doc.close();
  }, [artifact.content]);
  
  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts"
      title={artifact.title}
    />
  );
}
```

### 5.2 其他渲染器实现

```typescript
// components/artifact/renderers/MermaidRenderer.tsx
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

export default function MermaidRenderer({ artifact }: { artifact: Artifact }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'strict'
    });
    
    const renderDiagram = async () => {
      const { svg } = await mermaid.render(
        `mermaid-${artifact.id}`,
        artifact.content
      );
      
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    };
    
    renderDiagram();
  }, [artifact.content, artifact.id]);
  
  return <div ref={containerRef} className="w-full h-full" />;
}

// components/artifact/renderers/SvgRenderer.tsx
export default function SvgRenderer({ artifact }: { artifact: Artifact }) {
  return (
    <div 
      className="w-full h-full flex items-center justify-center p-4"
      dangerouslySetInnerHTML={{ __html: artifact.content }}
    />
  );
}

// components/artifact/renderers/MarkdownRenderer.tsx
import { Markdown } from '@/components/markdown';

export default function MarkdownRenderer({ artifact }: { artifact: Artifact }) {
  return (
    <div className="p-4 overflow-auto h-full">
      <Markdown>{artifact.content}</Markdown>
    </div>
  );
}

// components/artifact/renderers/CodeRenderer.tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';

export default function CodeRenderer({ artifact }: { artifact: Artifact }) {
  const { theme } = useTheme();
  const codeStyle = theme === 'light' ? oneLight : tomorrow;
  
  return (
    <SyntaxHighlighter
      language={artifact.language || 'text'}
      style={codeStyle}
      customStyle={{
        margin: 0,
        padding: '1rem',
        height: '100%',
        fontSize: '0.875rem'
      }}
    >
      {artifact.content}
    </SyntaxHighlighter>
  );
}
```

## 六、AI 集成方案（无需 MCP）

### 6.1 AI 模型集成

```typescript
// 修改 app/api/chat/route.ts
import { parseArtifactTags } from '@/components/artifact/parser';

export async function POST(req: Request) {
  // ... 现有代码
  
  const response = await generateAIResponse(messages, {
    systemPrompt: `
      ${existingPrompt}
      
      You can create artifacts using <antArtifact> tags for substantial content:
      - Code snippets: type="application/vnd.ant.code" language="python"
      - HTML pages: type="text/html"
      - SVG graphics: type="image/svg+xml"
      - Mermaid diagrams: type="application/vnd.ant.mermaid"
      - Markdown documents: type="text/markdown"
      
      Example:
      <antArtifact identifier="my-code" type="application/vnd.ant.code" language="python" title="Python Example">
        def hello_world():
            print("Hello, World!")
      </antArtifact>
    `
  });
  
  // 解析 artifact 标签
  const { content, artifacts } = parseArtifactTags(response);
  
  return new Response(JSON.stringify({
    content,
    artifacts
  }));
}
```

## 七、UI 集成

### 7.1 聊天界面集成

```typescript
// components/message.tsx
import { ArtifactCard } from './artifact/ArtifactCard';

export function Message({ message }: { message: ChatMessage }) {
  const { artifacts } = useArtifact();
  
  return (
    <div className="message">
      <Markdown>{message.content}</Markdown>
      
      {message.artifacts?.map(artifactId => {
        const artifact = artifacts.get(artifactId);
        if (!artifact) return null;
        
        return (
          <ArtifactCard
            key={artifact.id}
            artifact={artifact}
            onClick={() => setActiveArtifact(artifact.id)}
          />
        );
      })}
    </div>
  );
}
```

### 7.2 布局调整

```typescript
// app/chat/[id]/page.tsx
import { ArtifactPreview } from '@/components/artifact/ArtifactPreview';

export default function ChatPage() {
  const { previewVisible } = useArtifact();
  
  return (
    <div className="flex h-screen">
      <div className={cn(
        "flex-1 transition-all",
        previewVisible && "lg:w-1/2"
      )}>
        {/* 现有聊天界面 */}
      </div>
      
      {previewVisible && (
        <div className="hidden lg:block lg:w-1/2 border-l">
          <ArtifactPreview />
        </div>
      )}
      
      {/* 移动端底部弹出 */}
      <Sheet open={previewVisible && isMobile}>
        <SheetContent side="bottom" className="h-[80vh]">
          <ArtifactPreview />
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

## 八、实施步骤

### 第一阶段：基础架构（2天）
1. 创建 Artifact 组件目录结构
2. 实现 ArtifactProvider 状态管理
3. 实现标签解析器
4. 创建基础 UI 组件

### 第二阶段：渲染器开发（2天）
1. 实现代码高亮渲染器
2. 实现 HTML 沙箱渲染器
3. 实现 SVG/Mermaid 渲染器
4. 实现 Markdown 渲染器

### 第三阶段：集成测试（2天）
1. 集成到聊天界面
2. 修改 AI 系统提示词
3. 响应式布局优化
4. 性能优化

### 第四阶段：完善优化（1天）
1. 错误处理
2. 加载状态
3. 动画过渡
4. 文档编写

## 九、依赖包

```json
{
  "dependencies": {
    "react-syntax-highlighter": "^15.5.0", // 代码高亮（已存在）
    "mermaid": "^10.6.0",                   // Mermaid 图表
    "remark-gfm": "^4.0.0"                  // Markdown GFM 支持（已存在）
  }
}
```

## 十、注意事项

1. **安全性**：所有用户生成内容必须在沙箱环境中执行
2. **性能**：使用动态导入和懒加载优化性能
3. **兼容性**：确保移动端和桌面端体验一致
4. **可访问性**：添加适当的 ARIA 标签和键盘导航支持
5. **错误处理**：优雅处理渲染失败和网络错误

## 十一、测试用例

```typescript
// 测试 artifact 创建
const testArtifact = `
<antArtifact identifier="test-python" type="application/vnd.ant.code" language="python" title="Test Script">
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
</antArtifact>
`;

// 测试 HTML 页面
const testHtmlPage = `
<antArtifact identifier="demo-page" type="text/html" title="Demo HTML Page">
<!DOCTYPE html>
<html>
<head>
    <title>Demo Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
        }
        button {
            padding: 10px 20px;
            font-size: 16px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello, Artifact!</h1>
        <p>This is a demo HTML page rendered in a sandbox.</p>
        <button onclick="alert('Button clicked!')">Click Me</button>
    </div>
</body>
</html>
</antArtifact>
`;

// 测试 Mermaid 图表
const testMermaidDiagram = `
<antArtifact identifier="flow-chart" type="application/vnd.ant.mermaid" title="Process Flow">
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
</antArtifact>
`;
```

## 十二、总结

该方案完整复刻了 chatmcp 中的 Artifact 系统（不含 React 组件沙箱），提供了：
- 完整的标签解析和渲染系统
- HTML 安全沙箱执行环境
- 支持代码、HTML、SVG、Mermaid、Markdown 等内容类型
- 优秀的用户体验设计
- 简化的实现方案，无需 MCP 服务集成
- 可扩展的架构设计

### 核心优势
1. **实现简单**：不需要复杂的 MCP 集成，只需修改 AI 提示词
2. **安全可靠**：HTML 内容在 iframe 沙箱中执行
3. **性能优秀**：使用动态导入和懒加载
4. **易于维护**：组件化设计，职责清晰

预计总开发时间：6个工作日