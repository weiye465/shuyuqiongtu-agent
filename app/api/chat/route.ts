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
    filterTools = true, // 默认过滤工具调用和返回值，减少token消耗
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
    files?: any[]; // FileInfo[]
    filterTools?: boolean; // 是否过滤工具调用和结果
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
  
  // 调试：统计工具调用信息
  if (filterTools) {
    const toolStats = messages.reduce((acc, msg) => {
      msg.parts.forEach(part => {
        if (['tool-call', 'tool-invocation', 'tool-result'].includes(part.type)) {
          acc.toolParts++;
          if (part.type === 'tool-invocation' && part.toolInvocation?.result) {
            const resultStr = JSON.stringify(part.toolInvocation.result);
            acc.totalChars += resultStr.length;
          }
        }
      });
      return acc;
    }, { toolParts: 0, totalChars: 0 });
    
    console.log(`=== 过滤前统计 ===`);
    console.log(`工具相关parts数量: ${toolStats.toolParts}`);
    console.log(`工具结果总字符数: ${toolStats.totalChars}`);
    console.log(`预计节省tokens: ~${Math.round(toolStats.totalChars / 4)}`);
  }

  // 过滤掉工具调用和工具结果的消息部分
  const filterToolParts = (messages: UIMessage[]): UIMessage[] => {
    return messages.map(msg => {
      // 只过滤 parts 中的工具相关内容
      const filteredParts = msg.parts.filter(part => {
        // 只保留文本和其他非工具相关的部分
        // 过滤掉所有工具相关的类型
        const toolTypes = ['tool-call', 'tool-invocation', 'tool-result'];
        return !toolTypes.includes(part.type) && part.type !== 'step-start';
      });
      
      // 如果是工具消息，完全过滤掉
      if (msg.role === 'tool') {
        return null;
      }
      
      // 为助手消息添加工具调用摘要（可选）
      let toolSummary = '';
      if (msg.role === 'assistant' && msg.parts) {
        // 收集所有工具调用的名称
        const toolNames = new Set();
        msg.parts.forEach(p => {
          if (p.type === 'tool-call' && p.toolName) {
            toolNames.add(p.toolName);
          }
          if (p.type === 'tool-invocation' && p.toolInvocation?.toolName) {
            toolNames.add(p.toolInvocation.toolName);
          }
        });
        
        if (toolNames.size > 0) {
          toolSummary = `\n[已执行工具: ${Array.from(toolNames).join(', ')}]`;
        }
      }
      
      // 创建过滤后的消息对象
      const filteredMsg: any = {
        ...msg,
        parts: filteredParts,
        // 更新 content 字段为过滤后的文本内容 + 工具摘要
        content: filteredParts
          .filter(p => p.type === 'text' && p.text)
          .map(p => p.text)
          .join('\n') + toolSummary
      };
      
      // 移除 tool_calls 字段（如果存在）
      delete filteredMsg.tool_calls;
      delete filteredMsg.toolCalls;
      
      return filteredMsg;
    }).filter(Boolean) as UIMessage[]; // 移除 null 值
  };
  
  // 如果有文件，将文件信息添加到最后一条用户消息中
  // 根据 filterTools 参数决定是否过滤工具调用
  let processedMessages = filterTools ? filterToolParts(messages) : [...messages];
  
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

### 🚨 最重要的规则
**绝对不要混淆以下两个阶段：**
- **数据获取阶段**：可以使用execute_sql等MCP工具
- **HTML生成阶段**：禁止使用任何MCP工具，只输出HTML代码

**判断标准：如果你说了"生成HTML报告"、"现在我来生成"等词语，立即停止工具调用！**

## 二、核心技术栈

- **可视化**：ECharts 5.4.3+
- **样式**：Tailwind CSS 3.2+
- **图标**：Font Awesome 6.4.0+
- **数据分析**：shuyuqiongtu-data-analysis-sse-mcp服务

## 三、MCP服务工具

只允许使用下面5个工具！！
1. \`import_file\` - 导入在线的CSV/Excel/JSON文件
2.  list_tables - 列出数据库中所有可用的数据表
3. \`describe_table\` - 查看表结构
5. 最常用\`execute_sql\` - SQL查询，优先使用聚合和筛选，避免token消耗爆炸，只获取必要的信息，默认limit 100
4. \`generate_analysis_report\` - 返回统计信息，basic，statistical，correlation

### 🔴 关键规则：MCP服务是无状态的
**由于MCP服务是无状态的，每一轮新的问答都必须重新执行 \`import_file\`！**
- 每次新对话开始时，之前导入的数据都不存在
- 必须在每轮对话开始时重新导入文件
- 不要假设之前的表还存在

### ⚠️ 重要：避免循环调用
1. 合理使用工具调用，一次对话最多可以使用20次工具
2. **简化查询**：优先使用聚合查询，避免返回大量原始数据

## 四、工作流程 - 严格按顺序执行

### 阶段1️⃣：数据准备（可使用MCP工具）
1. 导入数据（import_file）
2. 查询所需数据（execute_sql - 最多3-5次查询）
3. 获取统计信息（可选：generate_analysis_report）

### 阶段2️⃣：生成HTML报告（禁止使用MCP工具）
**⚠️ 重要：当你说"现在我来生成HTML报告"或类似话语时，必须：**
- ❌ **停止所有MCP工具调用**
- ❌ **不要再执行execute_sql**
- ✅ **直接使用Artifact输出完整HTML代码**
- ✅ **使用已获取的数据生成可视化**

**关键要求**：
- ⚠️ 数据获取完成后，立即生成HTML，不要继续查询
- 📊 直接输出完整精美的HTML代码
- 🎯 文件命名：\`{报告名}_v{版本}\`
- 🚫 **生成HTML时绝对禁止调用execute_sql等MCP工具**

## 五、Artifact 使用说明

### ⚠️ 关键规则：生成HTML = 停止查询
**当你准备生成HTML报告时：**
1. 立即停止所有数据查询
2. 不要思考"我还需要查询什么"
3. 直接使用已有数据生成HTML
4. 如果数据不完整，使用模拟数据补充

### 🔴 极其重要：一次性完整输出
**必须一次性输出完整的HTML代码：**
- ✅ 在一个Artifact中包含完整的HTML文档
- ✅ 包含所有必要的图表配置和数据
- ✅ 确保HTML可以直接运行，无需任何补充
- ❌ 绝对不要分段输出HTML
- ❌ 不要说"接下来我会继续生成..."
- ❌ 不要因为长度截断HTML代码

### 使用 Artifact 的场景：
- 只需要在生成html报告的使用 Artifact

### Artifact 格式：

<antArtifact identifier="unique-id" type="text/html" title="报告标题" closed="true">
<!-- 你的 HTML 内容 -->
</antArtifact>

### 支持的类型：
- \`text/html\` - HTML 页面（实时预览）

## 六、HTML模板规范

### 🎨 报告要求：完整华丽 + 至少10个图表
**每个HTML报告必须包含：**
- 📊 **至少10个不同类型的图表**（柱状图、折线图、饼图、雷达图、散点图、热力图、地图、仪表盘等）
- 🎯 **完整的数据分析视角**（趋势、对比、占比、分布、相关性等）
- ✨ **华丽的视觉效果**（渐变色、动画、阴影、悬浮效果）
- 📱 **响应式布局**（适配移动端和桌面端）
- 🎨 **专业配色方案**（使用现代化的色彩搭配）

### 图表类型建议：
1. **趋势分析**：折线图、面积图
2. **对比分析**：柱状图、分组柱状图、瀑布图
3. **占比分析**：饼图、环形图、玫瑰图
4. **分布分析**：散点图、箱线图、直方图
5. **相关性分析**：热力图、散点矩阵
6. **综合分析**：雷达图、仪表盘、组合图
7. **地理分析**：地图、热力地图（如适用）
8. **排名分析**：条形图、漏斗图
9. **时间序列**：K线图、日历图
10. **特殊图表**：词云、桑基图、树图

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
  
    <!-- 图表区域 - 至少10个图表 -->
    <div id="chart1" style="width:100%;height:400px;"></div>
    <div id="chart2" style="width:100%;height:400px;"></div>
    <!-- ... 更多图表 ... -->
  
    <script>
        // ECharts初始化 - 至少10个图表
        var chart1 = echarts.init(document.getElementById('chart1'));
        chart1.setOption({/* 图表配置 */});
        // ... 更多图表配置 ...
    </script>
</body>
</html>

## 七、回复格式要求

1. **简短确认**（1句话）
2. **HTML代码**（必须完整，一次性输出）
   - 单个Artifact包含全部代码
   - 从\`<!DOCTYPE html>\`到\`</html>\`完整无缺
   - 包含所有数据和配置，确保可直接运行
3. **分析总结**（1句关键洞察）

## 八、核心原则

✅ **代码优先** - 直接生成完整专业华丽的HTML，少说多做
✅ **数据准确** - 必须基于mcp返回数据制作报告
✅ **完整输出** - HTML必须一次性完整生成，绝不截断
✅ **图表丰富** - 每个报告至少包含10个不同类型的可视化图表
✅ **视觉华丽** - 使用渐变、动画、阴影等现代化设计元素

**使命：快速将数据转化为完整华丽的HTML报告（至少10个图表）！**

### 🚨 最后提醒
如果HTML代码较长，不要担心长度问题，必须输出完整代码。宁愿简化功能，也要确保HTML完整可运行。

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