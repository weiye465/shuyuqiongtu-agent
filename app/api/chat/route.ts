import { model, type modelID } from "@/ai/providers";
import { smoothStream, streamText, type UIMessage } from "ai";
import { appendResponseMessages } from 'ai';
import { saveChat, saveMessages, convertToDBMessages } from '@/lib/chat-store';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeMCPClients, type MCPServerConfig } from '@/lib/mcp-client';
import { generateTitle } from '@/app/actions';

import { checkBotId } from "botid/server";

export async function POST(req: Request) {
  const {
    messages,
    chatId,
    selectedModel,
    userId,
    mcpServers = [],
    files = [],
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
    files?: any[]; // FileInfo[]
  } = await req.json();

  // 暂时禁用 BotId 检查以调试文件上传问题
  // const { isBot, isGoodBot } = await checkBotId();

  // if (isBot && !isGoodBot) {
  //   return new Response(
  //     JSON.stringify({ error: "Bot is not allowed to access this endpoint" }),
  //     { status: 401, headers: { "Content-Type": "application/json" } }
  //   );
  // }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "User ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = chatId || nanoid();

  // Check if chat already exists for the given ID
  // If not, create it now
  let isNewChat = false;
  if (chatId) {
    try {
      const existingChat = await db.query.chats.findFirst({
        where: and(
          eq(chats.id, chatId),
          eq(chats.userId, userId)
        )
      });
      isNewChat = !existingChat;
    } catch (error) {
      console.error("Error checking for existing chat:", error);
      isNewChat = true;
    }
  } else {
    // No ID provided, definitely new
    isNewChat = true;
  }

  // If it's a new chat, save it immediately
  if (isNewChat && messages.length > 0) {
    try {
      // Generate a title based on first user message
      const userMessage = messages.find(m => m.role === 'user');
      let title = 'New Chat';

      if (userMessage) {
        try {
          title = await generateTitle([userMessage]);
        } catch (error) {
          console.error("Error generating title:", error);
        }
      }

      // Save the chat immediately so it appears in the sidebar
      await saveChat({
        id,
        userId,
        title,
        messages: [],
      });
    } catch (error) {
      console.error("Error saving new chat:", error);
    }
  }

  // Initialize MCP clients using the already running persistent HTTP/SSE servers
  const { tools, cleanup } = await initializeMCPClients(mcpServers, req.signal);

  console.log("messages", messages);
  console.log("parts", messages.map(m => m.parts.map(p => p)));
  console.log("files", files);

  // 如果有文件，将文件信息添加到最后一条用户消息中
  let processedMessages = [...messages];
  
  console.log("=== File Processing Debug ===");
  console.log("Files received:", JSON.stringify(files, null, 2));
  console.log("Files length:", files?.length);
  console.log("Files is array:", Array.isArray(files));
  
  if (files && files.length > 0) {
    console.log("Processing files...");
    const lastUserMessageIndex = processedMessages.findLastIndex(m => m.role === 'user');
    console.log("Last user message index:", lastUserMessageIndex);
    
    if (lastUserMessageIndex !== -1) {
      try {
        // 安全地处理文件信息
        const fileInfoArray = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          console.log(`Processing file ${i}:`, JSON.stringify(file, null, 2));
          
          if (!file) {
            console.error(`File at index ${i} is undefined`);
            continue;
          }
          
          const fileName = file.name || 'unknown';
          const fileType = file.type || 'unknown';
          const fileUrl = file.url || '';
          
          console.log(`File ${i} details - name: ${fileName}, type: ${fileType}, url: ${fileUrl}`);
          
          fileInfoArray.push(`已上传文件: ${fileName} (${fileType.toUpperCase()}) - URL: ${fileUrl}`);
        }
        
        const fileInfo = fileInfoArray.join('\n');
        console.log("Generated file info:", fileInfo);
        
        // 创建新的消息副本，添加文件信息到 content 和 parts
        const lastUserMessage = processedMessages[lastUserMessageIndex];
        console.log("Last user message before modification:", JSON.stringify(lastUserMessage, null, 2));
        
        // 获取原始的 parts 数组，确保包含文件信息
        const originalParts = lastUserMessage.parts || [];
        const updatedParts = [...originalParts];
        
        // 如果有文本部分，将文件信息添加到第一个文本部分
        const textPartIndex = updatedParts.findIndex(p => p.type === 'text');
        if (textPartIndex !== -1) {
          updatedParts[textPartIndex] = {
            ...updatedParts[textPartIndex],
            text: updatedParts[textPartIndex].text + '\n\n' + fileInfo
          };
        } else {
          // 如果没有文本部分，添加一个新的
          updatedParts.push({
            type: 'text',
            text: fileInfo
          });
        }
        
        processedMessages[lastUserMessageIndex] = {
          ...lastUserMessage,
          content: lastUserMessage.content + '\n\n' + fileInfo,
          parts: updatedParts
        };
        
        console.log("Last user message after modification:", JSON.stringify(processedMessages[lastUserMessageIndex], null, 2));
      } catch (error) {
        console.error("Error processing files:", error);
        console.error("Error stack:", error.stack);
      }
    }
  }
  console.log("=== End File Processing Debug ===");

  // Track if the response has completed
  let responseCompleted = false;

  const result = streamText({
    model: model.languageModel(selectedModel),
    system: `# 数驭穹图 HTML报告生成器 - 精简版

## 一、角色定位

你是「数驭穹图」数据分析HTML报告生成助手，将数据转换为可视化HTML代码。

## 二、核心技术栈

- **可视化**：ECharts 5.4.3+
- **样式**：Tailwind CSS 3.2+
- **图标**：Font Awesome 6.4.0+
- **数据分析**：shuyuqiongtu-data-analysis-sse-mcp服务

## 三、MCP服务工具

1. \`import_file\` - 导入CSV/Excel/JSON文件
2. \`execute_sql\` - SQL查询（⚠️必须获取全量数据）
3. \`describe_table\` - 查看表结构
4. \`generate_analysis_report\` - 生成分析报告

## 四、工作流程

1. 导入数据 → 2. 获取全量数据 → 3. 生成HTML代码 → 4. 输出报告

**关键要求**：
- ⚠️ 必须获取所有数据行（使用COUNT(*)确认，必要时分批查询）
- 📊 直接输出完整HTML代码，避免冗长说明
- 🎯 文件命名：\`{报告名}_v{版本}.html\`

## 五、Artifact 使用说明

### 使用 Artifact 的场景：
- ✅ 完整的 HTML 报告（>15行）
- ✅ 数据分析脚本
- ✅ 可视化图表代码
- ✅ SQL 查询语句集合
- ✅ Mermaid 流程图

### Artifact 格式：

<antArtifact identifier="unique-id" type="text/html" title="报告标题" closed="true">
<!-- 你的 HTML 内容 -->
</antArtifact>

### 支持的类型：
- \`text/html\` - HTML 页面（实时预览）
- \`application/vnd.ant.code\` language="sql" - SQL 代码
- \`application/vnd.ant.code\` language="python" - Python 脚本
- \`application/vnd.ant.mermaid\` - Mermaid 图表
- \`text/markdown\` - Markdown 文档

## 六、HTML模板规范

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{报告名}_v{版本}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
</head>
<body class="bg-gray-50">
    <!-- 核心指标卡片 -->
    <div class="container mx-auto px-4">
        <!-- 指标展示 -->
    </div>
  
    <!-- 图表区域 -->
    <div id="chart" style="width:100%;height:400px;"></div>
  
    <script>
        // ECharts初始化
        var chart = echarts.init(document.getElementById('chart'));
        chart.setOption({/* 图表配置 */});
    </script>
</body>
</html>

## 七、回复格式要求

1. **简短确认**（1句话）
2. **HTML代码**（完整可运行）
3. **分析总结**（2-3句关键洞察）
4. **探索建议**（3-5个新分析方向）

## 八、核心原则

✅ **代码优先** - 直接生成完整专业华丽的HTML，少说多做
✅ **数据准确** - 必须基于mcp返回数据制作报告

**使命：快速将数据转化为精美HTML报告！**

今天的日期：${new Date().toISOString().split('T')[0]}`,
    messages: processedMessages, // 使用处理后的消息（包含文件信息）
    tools,
    maxSteps: 20,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      },
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: 12000
        },
      }
    },
    experimental_transform: smoothStream({
      delayInMs: 5, // optional: defaults to 10ms
      chunking: 'line', // optional: defaults to 'word'
    }),
    onError: (error) => {
      console.error(JSON.stringify(error, null, 2));
    },
    async onFinish({ response }) {
      responseCompleted = true;
      const allMessages = appendResponseMessages({
        messages: processedMessages, // 使用处理后的消息
        responseMessages: response.messages,
      });

      await saveChat({
        id,
        userId,
        messages: allMessages,
        files, // 保存文件信息
      });

      const dbMessages = convertToDBMessages(allMessages, id);
      await saveMessages({ messages: dbMessages });

      // Clean up resources - now this just closes the client connections
      // not the actual servers which persist in the MCP context
      await cleanup();
    }
  });

  // Ensure cleanup happens if the request is terminated early
  req.signal.addEventListener('abort', async () => {
    if (!responseCompleted) {
      console.log("Request aborted, cleaning up resources");
      try {
        await cleanup();
      } catch (error) {
        console.error("Error during cleanup on abort:", error);
      }
    }
  });

  result.consumeStream()
  // Add chat ID to response headers so client can know which chat was created
  return result.toDataStreamResponse({
    sendReasoning: true,
    headers: {
      'X-Chat-ID': id
    },
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
      }
      console.error(error);
      return "An error occurred.";
    },
  });
}