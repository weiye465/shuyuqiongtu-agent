import { db } from '../lib/db';
import { chats, messages } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

async function exportChatHistory(chatId: string) {
  try {
    console.log(`正在导出会话: ${chatId}`);
    
    // 获取会话信息
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId)
    });
    
    if (!chat) {
      console.error(`未找到会话: ${chatId}`);
      return;
    }
    
    // 获取所有消息
    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)]
    });
    
    // 分析token消耗
    const analysis = {
      totalMessages: chatMessages.length,
      messagesByRole: {
        user: 0,
        assistant: 0,
        tool: 0
      },
      tokenEstimates: {
        total: 0,
        byRole: {
          user: 0,
          assistant: 0,
          tool: 0
        },
        largestMessages: [] as any[]
      },
      toolCalls: {
        total: 0,
        byTool: {} as Record<string, number>,
        largestResults: [] as any[]
      }
    };
    
    // 处理每条消息
    chatMessages.forEach((msg, index) => {
      const role = msg.role as 'user' | 'assistant' | 'tool';
      analysis.messagesByRole[role]++;
      
      // 估算token（粗略计算：字符数/4）
      const messageStr = JSON.stringify(msg.parts);
      const estimatedTokens = Math.ceil(messageStr.length / 4);
      analysis.tokenEstimates.byRole[role] += estimatedTokens;
      analysis.tokenEstimates.total += estimatedTokens;
      
      // 记录最大的消息
      if (estimatedTokens > 10000) {
        analysis.tokenEstimates.largestMessages.push({
          index,
          role,
          estimatedTokens,
          charactersCount: messageStr.length,
          preview: messageStr.substring(0, 200) + '...'
        });
      }
      
      // 分析工具调用
      if (Array.isArray(msg.parts)) {
        msg.parts.forEach((part: any) => {
          if (part.type === 'tool-call') {
            analysis.toolCalls.total++;
            const toolName = part.toolName || 'unknown';
            analysis.toolCalls.byTool[toolName] = (analysis.toolCalls.byTool[toolName] || 0) + 1;
          }
          
          if (part.type === 'tool-result' && part.result) {
            const resultStr = JSON.stringify(part.result);
            const resultTokens = Math.ceil(resultStr.length / 4);
            if (resultTokens > 5000) {
              analysis.toolCalls.largestResults.push({
                messageIndex: index,
                toolName: part.toolName,
                estimatedTokens: resultTokens,
                charactersCount: resultStr.length,
                preview: resultStr.substring(0, 200) + '...'
              });
            }
          }
        });
      }
    });
    
    // 排序最大的结果
    analysis.tokenEstimates.largestMessages.sort((a, b) => b.estimatedTokens - a.estimatedTokens);
    analysis.toolCalls.largestResults.sort((a, b) => b.estimatedTokens - a.estimatedTokens);
    
    // 保存完整数据
    const exportData = {
      chat: {
        id: chat.id,
        title: chat.title,
        userId: chat.userId,
        files: chat.files,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      },
      messages: chatMessages,
      analysis,
      exportedAt: new Date().toISOString()
    };
    
    // 写入文件
    const fileName = `chat_history_${chatId}_analysis.json`;
    const filePath = path.join(process.cwd(), fileName);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    console.log(`\n导出成功: ${fileName}`);
    console.log('\n=== Token消耗分析 ===');
    console.log(`总消息数: ${analysis.totalMessages}`);
    console.log(`预估总Token: ${analysis.tokenEstimates.total.toLocaleString()}`);
    console.log('\n按角色分布:');
    console.log(`  User: ${analysis.tokenEstimates.byRole.user.toLocaleString()} tokens`);
    console.log(`  Assistant: ${analysis.tokenEstimates.byRole.assistant.toLocaleString()} tokens`);
    console.log(`  Tool: ${analysis.tokenEstimates.byRole.tool.toLocaleString()} tokens`);
    console.log(`\n工具调用: ${analysis.toolCalls.total} 次`);
    
    if (analysis.toolCalls.largestResults.length > 0) {
      console.log('\n最大的工具返回值 (Top 5):');
      analysis.toolCalls.largestResults.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.toolName}: ${result.estimatedTokens.toLocaleString()} tokens`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('导出失败:', error);
    process.exit(1);
  }
}

// 执行导出
const chatId = process.argv[2] || 'bpDhLIQXoI8JEDoL2gn_r';
exportChatHistory(chatId);