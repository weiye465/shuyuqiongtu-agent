// Artifact 类型定义

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

export interface ParsedContent {
  content: string;
  artifacts: Artifact[];
}