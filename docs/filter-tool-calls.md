# 过滤工具调用功能说明

## 功能概述

在向 AI 发送历史对话信息时，可以选择过滤掉工具调用和工具返回值信息，只保留纯文本对话内容。这可以减少 token 消耗，让 AI 更专注于对话内容本身。

## 实现原理

### 1. 消息结构

每条消息包含 `parts` 数组，其中可能包含：
- `type: 'text'` - 文本内容
- `type: 'tool-call'` - 工具调用信息
- `type: 'tool-result'` - 工具返回结果

### 2. 过滤逻辑

`filterToolParts` 函数会：
1. 过滤每条消息的 `parts`，只保留 `type === 'text'` 的部分
2. 完全移除 `role === 'tool'` 的消息
3. 重新生成 `content` 字段，只包含文本内容

## 使用方法

### API 端

在 `/api/chat` 路由中，通过 `filterTools` 参数控制：

```typescript
// POST 请求体
{
  messages: [...],
  filterTools: true, // 启用过滤
  // 其他参数...
}
```

### 前端调用

在 `components/chat.tsx` 中使用：

```typescript
const { messages, handleSubmit } = useChat({
  body: {
    selectedModel,
    userId,
    mcpServers: mcpServersForApi,
    files,
    filterTools: true, // 启用过滤
  },
  // ...
});
```

## 过滤效果示例

### 过滤前的消息：
```json
[
  {
    "role": "user",
    "content": "分析这个文件",
    "parts": [
      { "type": "text", "text": "分析这个文件" }
    ]
  },
  {
    "role": "assistant",
    "content": "我来分析文件...",
    "parts": [
      { "type": "text", "text": "我来分析文件..." },
      { "type": "tool-call", "toolName": "import_file", "args": {...} }
    ]
  },
  {
    "role": "tool",
    "content": "文件导入成功",
    "parts": [
      { "type": "tool-result", "result": {...} }
    ]
  }
]
```

### 过滤后的消息：
```json
[
  {
    "role": "user",
    "content": "分析这个文件",
    "parts": [
      { "type": "text", "text": "分析这个文件" }
    ]
  },
  {
    "role": "assistant",
    "content": "我来分析文件...",
    "parts": [
      { "type": "text", "text": "我来分析文件..." }
    ]
  }
]
```

## 优势

1. **减少 Token 消耗**：过滤掉冗余的工具调用信息
2. **聚焦对话内容**：AI 可以更专注于对话逻辑
3. **灵活控制**：可以根据需要选择是否过滤

## 注意事项

- 过滤后的历史记录可能丢失部分上下文信息
- 建议在不需要工具调用历史的场景下使用
- 可以通过前端 UI 让用户选择是否启用过滤