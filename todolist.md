# 数驭穹图智能体 - 开发待办清单

## 📋 任务总览
1. **文件上传功能** - 支持Excel/CSV上传到Cloudflare R2
2. **Artifact组件** - 实现HTML报告预览组件
3. **提示词优化** - 支持生成Artifact兼容的HTML报告
4. **UI优化** - 改进首页界面和用户体验

---

## 🚀 模块一：文件上传功能

### 1.1 数据库表结构更新
**输入**：现有的chats表结构  
**输出**：更新后包含files字段的表结构  
**实现**：
```typescript
// lib/db/schema.ts 修改
export type FileInfo = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: 'csv' | 'excel';
  uploadedAt: number; // 时间戳（毫秒）
};

export const chats = pgTable('chats', {
  // ... 现有字段
  files: json('files').$type<FileInfo[]>().default([]).notNull(), // 文件列表
});
```
**测试**：
- [ ] 运行 `npm run db:push` 更新数据库
- [ ] 验证新字段创建成功

### 1.2 文件类型验证模块
**输入**：上传的文件对象  
**输出**：验证结果（通过/拒绝）  
**实现**：
```typescript
// lib/validators/file-validator.ts
export const ALLOWED_TYPES = {
  'text/csv': 'csv',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel'
};

export function validateFile(file: File): boolean {
  return ALLOWED_TYPES.hasOwnProperty(file.type);
}
```
**测试**：
- [ ] 测试CSV文件上传
- [ ] 测试Excel文件上传
- [ ] 测试拒绝其他文件类型

### 1.3 Cloudflare R2 存储集成（复刻自 shuyuqiongtu-web-main）
**输入**：文件Buffer和元数据  
**输出**：R2存储URL  
**实现**：
```typescript
// lib/storage.ts - 完全复刻自 shuyuqiongtu-web-main/src/lib/storage.ts
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

export class Storage {
  private s3: S3Client;

  constructor(config?: StorageConfig) {
    this.s3 = new S3Client({
      endpoint: config?.endpoint || process.env.STORAGE_ENDPOINT || "",
      region: config?.region || process.env.STORAGE_REGION || "auto",
      credentials: {
        accessKeyId: config?.accessKey || process.env.STORAGE_ACCESS_KEY || "",
        secretAccessKey: config?.secretKey || process.env.STORAGE_SECRET_KEY || "",
      },
    });
  }

  async uploadFile({
    body,
    key,
    contentType,
    bucket,
    onProgress,
    disposition = "inline",
  }: {
    body: Buffer;
    key: string;
    contentType?: string;
    bucket?: string;
    onProgress?: (progress: number) => void;
    disposition?: "inline" | "attachment";
  }) {
    // 实现与原文件相同
  }

  async downloadAndUpload({ url, key, bucket, contentType, disposition = "inline" }) {
    // 从URL下载并上传到R2
  }
}
```
**配置**：
```env
# Cloudflare R2 配置
STORAGE_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=your_r2_access_key
STORAGE_SECRET_KEY=your_r2_secret_key
STORAGE_BUCKET=shuyuqiongtu-files
STORAGE_DOMAIN=https://your-custom-domain.com  # 可选：自定义域名
```
**依赖安装**：
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```
**测试**：
- [ ] 测试文件上传到R2
- [ ] 测试进度回调功能
- [ ] 测试URL下载并上传功能
- [ ] 验证返回的URL可访问

### 1.4 文件上传API端点
**输入**：FormData包含文件和chatId  
**输出**：上传成功响应和文件URL  
**实现**：
```typescript
// app/api/upload/route.ts
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const chatId = formData.get('chatId') as string;
  
  // 1. 验证文件类型
  // 2. 上传到R2
  // 3. 更新chat记录的files字段
  // 4. 返回文件URL
}
```
**测试**：
- [ ] 使用Postman测试API
- [ ] 验证数据库更新
- [ ] 验证文件存储

### 1.5 前端上传组件（集成到输入框）
**输入**：用户选择的文件  
**输出**：上传进度、文件胶囊展示和结果反馈  
**实现**：
```tsx
// components/file-upload.tsx - 文件上传核心组件
- 文件验证（类型、大小）
- 上传到R2存储
- 进度条显示
- 文件胶囊展示（带删除功能）

// components/textarea-with-upload.tsx - 集成输入框
- 整合文件上传按钮到输入框工具栏
- 文件胶囊显示在输入框上方
- 支持文件+文本混合发送
```
**特性**：
- 📎 文件上传按钮集成在输入框左下角
- 💊 文件胶囊展示（蓝色圆角，显示文件名、大小、删除按钮）
- 📊 上传进度条
- ⚠️ 错误提示
- 🎯 文件类型限制（仅CSV/Excel）
- 📏 文件大小限制（10MB）

**使用方式**：
```tsx
// 在chat.tsx中使用
const [files, setFiles] = useState<FileInfo[]>([]);

<TextareaWithUpload
  chatId={chatId}
  files={files}
  onFilesChange={setFiles}
  // ... 其他props
/>
```
**测试**：
- [ ] 测试文件选择上传
- [ ] 测试文件胶囊展示和删除
- [ ] 测试上传进度显示
- [ ] 测试错误提示（错误类型、超大文件）
- [ ] 测试文件+文本混合发送

---

## 🎨 模块二：Artifact组件

### 2.1 Artifact容器组件
**输入**：HTML字符串内容  
**输出**：渲染的预览界面  
**实现**：
```tsx
// components/artifact.tsx
export function Artifact({ content, type = 'html' }) {
  if (type === 'html') {
    return (
      <div className="artifact-container">
        <iframe 
          srcDoc={content}
          className="w-full h-full"
          sandbox="allow-scripts"
        />
      </div>
    );
  }
}
```
**测试**：
- [ ] 测试HTML渲染
- [ ] 测试样式隔离
- [ ] 测试脚本执行

### 2.2 消息解析器
**输入**：AI响应消息  
**输出**：识别的HTML内容块  
**实现**：
```typescript
// lib/parsers/message-parser.ts
export function extractHTMLArtifact(message: string): string | null {
  const htmlRegex = /```html\n([\s\S]*?)```/;
  const match = message.match(htmlRegex);
  return match ? match[1] : null;
}
```
**测试**：
- [ ] 测试HTML代码块提取
- [ ] 测试多个代码块处理
- [ ] 测试无代码块情况

### 2.3 自动展示逻辑
**输入**：检测到的HTML内容  
**输出**：自动打开Artifact预览  
**实现**：
```tsx
// components/messages.tsx 修改
useEffect(() => {
  const htmlContent = extractHTMLArtifact(message.content);
  if (htmlContent) {
    setShowArtifact(true);
    setArtifactContent(htmlContent);
  }
}, [message]);
```
**测试**：
- [ ] 测试自动检测
- [ ] 测试手动关闭/打开
- [ ] 测试多个artifact切换

---

## 📝 模块三：提示词优化

### 3.1 提示词更新
**输入**：现有提示词  
**输出**：支持Artifact的提示词  
**实现**：
```markdown
// 在system prompt中添加
当生成HTML报告时：
1. 将完整HTML代码包裹在```html代码块中
2. 确保HTML是自包含的（包含所有CDN依赖）
3. 代码将在iframe中渲染，注意安全策略
```
**测试**：
- [ ] 测试生成的HTML格式
- [ ] 验证Artifact识别
- [ ] 测试渲染效果

---

## 🎯 模块四：UI优化

### 4.1 Logo和品牌展示
**输入**：Logo图片和品牌名称  
**输出**：更新的导航栏  
**实现**：
```tsx
// components/sidebar.tsx
<div className="flex items-center gap-2 p-4">
  <img src="/logo.png" className="w-8 h-8" />
  <span className="font-bold">数驭穹图</span>
</div>
```
**测试**：
- [ ] Logo显示正确
- [ ] 响应式布局

### 4.2 空状态设计
**输入**：无对话时的界面  
**输出**：友好的空状态提示  
**实现**：
```tsx
// components/empty-state.tsx
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Icon className="w-16 h-16 text-gray-400" />
      <h3>开始您的数据分析之旅</h3>
      <p>上传Excel或CSV文件，让AI帮您分析</p>
    </div>
  );
}
```
**测试**：
- [ ] 空状态显示
- [ ] 引导用户操作

### 4.3 界面元素控制
**输入**：需要隐藏的UI元素列表  
**输出**：简化后的界面  
**实现**：
```tsx
// 隐藏MCP服务器配置
// components/sidebar.tsx - 注释或删除MCPServerManager

// 隐藏模型选择
// components/textarea.tsx - 移除ModelSelector

// 禁用用户ID编辑
// components/user-menu.tsx - 设置为只读
<input value={userId} readOnly disabled />
```
**测试**：
- [ ] MCP配置已隐藏
- [ ] 模型选择已隐藏
- [ ] 用户ID不可编辑

---

## 📊 测试计划

### 集成测试
1. **端到端文件上传流程**
   - 选择文件 → 上传 → 存储 → 显示在聊天中
   
2. **HTML报告生成流程**
   - 发送分析请求 → AI生成HTML → 自动展示Artifact

3. **UI交互测试**
   - 首页加载 → 空状态 → 上传文件 → 查看报告

### 性能测试
- [ ] 大文件上传（>10MB）
- [ ] 复杂HTML渲染
- [ ] 并发请求处理

### 兼容性测试
- [ ] Chrome/Firefox/Safari
- [ ] 移动端响应式
- [ ] 不同文件格式

---

## 🔄 开发顺序建议

1. **第一阶段**：UI优化（最简单，可立即见效）
2. **第二阶段**：Artifact组件（独立模块，易测试）
3. **第三阶段**：文件上传功能（涉及后端和存储）
4. **第四阶段**：提示词优化（需要与其他功能配合）

---

## 📝 注意事项

- 每个模块都可以独立开发和测试
- 使用feature分支进行开发
- 完成一个模块后进行代码审查
- 保持向后兼容性