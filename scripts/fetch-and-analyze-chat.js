const fs = require('fs');
const path = require('path');

async function fetchAndAnalyzeChat(chatId, userId) {
  try {
    console.log(`正在获取会话: ${chatId}`);
    
    // 获取会话数据
    const response = await fetch(`http://localhost:3000/api/chats/${chatId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId // 尝试通过header传递
      }
    });
    
    if (!response.ok) {
      // 如果失败，尝试从localStorage模拟的方式
      console.log('尝试从本地存储获取...');
      
      // 模拟浏览器环境获取数据
      const browserResponse = await fetch('http://localhost:3000/api/chats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `userId=${userId}` // 模拟cookie
        }
      });
      
      if (!browserResponse.ok) {
        throw new Error(`获取会话列表失败: ${browserResponse.status}`);
      }
      
      const allChats = await browserResponse.json();
      const targetChat = allChats.find(c => c.id === chatId);
      
      if (!targetChat) {
        throw new Error(`未找到会话: ${chatId}`);
      }
      
      return analyzeChat(targetChat);
    }
    
    const chatData = await response.json();
    return analyzeChat(chatData);
    
  } catch (error) {
    console.error('获取失败，尝试分析本地浏览器存储的数据...');
    
    // 创建一个分析模板
    console.log('\n请在浏览器控制台运行以下代码来导出数据：');
    console.log(`
// 在浏览器控制台运行此代码
(function exportChatData() {
  const chatId = '${chatId}';
  const messages = JSON.parse(localStorage.getItem('messages') || '[]');
  const chatMessages = messages.filter(m => m.chatId === chatId);
  
  // 分析token消耗
  const analysis = {
    totalMessages: chatMessages.length,
    messagesByRole: {},
    tokenEstimates: {
      total: 0,
      byRole: {},
      largestMessages: []
    },
    toolCalls: {
      total: 0,
      byTool: {},
      largestResults: []
    }
  };
  
  chatMessages.forEach((msg, index) => {
    const role = msg.role;
    analysis.messagesByRole[role] = (analysis.messagesByRole[role] || 0) + 1;
    
    const messageStr = JSON.stringify(msg);
    const estimatedTokens = Math.ceil(messageStr.length / 4);
    analysis.tokenEstimates.byRole[role] = (analysis.tokenEstimates.byRole[role] || 0) + estimatedTokens;
    analysis.tokenEstimates.total += estimatedTokens;
    
    if (estimatedTokens > 10000) {
      analysis.tokenEstimates.largestMessages.push({
        index,
        role,
        estimatedTokens,
        preview: messageStr.substring(0, 200)
      });
    }
    
    // 分析工具调用
    if (msg.toolInvocations) {
      msg.toolInvocations.forEach(tool => {
        analysis.toolCalls.total++;
        const toolName = tool.toolName || 'unknown';
        analysis.toolCalls.byTool[toolName] = (analysis.toolCalls.byTool[toolName] || 0) + 1;
        
        if (tool.result) {
          const resultStr = JSON.stringify(tool.result);
          const resultTokens = Math.ceil(resultStr.length / 4);
          if (resultTokens > 5000) {
            analysis.toolCalls.largestResults.push({
              messageIndex: index,
              toolName,
              estimatedTokens: resultTokens
            });
          }
        }
      });
    }
  });
  
  // 复制到剪贴板
  const exportData = {
    chatId,
    messages: chatMessages,
    analysis
  };
  
  console.log('分析结果：', analysis);
  console.log('\\n完整数据已准备好，运行下面的命令复制到剪贴板：');
  console.log('copy(JSON.stringify(exportData, null, 2))');
  
  return exportData;
})();
    `);
    
    throw error;
  }
}

function analyzeChat(chatData) {
  const analysis = {
    chatId: chatData.id,
    title: chatData.title,
    totalMessages: chatData.messages?.length || 0,
    messagesByRole: {},
    tokenEstimates: {
      total: 0,
      byRole: {},
      largestMessages: [],
      toolResults: []
    }
  };
  
  if (chatData.messages) {
    chatData.messages.forEach((msg, index) => {
      const role = msg.role;
      analysis.messagesByRole[role] = (analysis.messagesByRole[role] || 0) + 1;
      
      const messageStr = JSON.stringify(msg);
      const estimatedTokens = Math.ceil(messageStr.length / 4);
      analysis.tokenEstimates.byRole[role] = (analysis.tokenEstimates.byRole[role] || 0) + estimatedTokens;
      analysis.tokenEstimates.total += estimatedTokens;
      
      if (estimatedTokens > 10000) {
        analysis.tokenEstimates.largestMessages.push({
          index,
          role,
          estimatedTokens,
          charactersCount: messageStr.length,
          preview: messageStr.substring(0, 200) + '...'
        });
      }
    });
  }
  
  // 保存分析结果
  const fileName = `chat_analysis_${chatData.id}.json`;
  fs.writeFileSync(fileName, JSON.stringify({
    ...chatData,
    analysis
  }, null, 2));
  
  console.log(`\n分析完成，已保存到: ${fileName}`);
  console.log('\n=== Token消耗分析 ===');
  console.log(`总消息数: ${analysis.totalMessages}`);
  console.log(`预估总Token: ${analysis.tokenEstimates.total.toLocaleString()}`);
  console.log('\n按角色分布:');
  Object.entries(analysis.tokenEstimates.byRole).forEach(([role, tokens]) => {
    console.log(`  ${role}: ${tokens.toLocaleString()} tokens`);
  });
  
  if (analysis.tokenEstimates.largestMessages.length > 0) {
    console.log('\n最大的消息 (Top 5):');
    analysis.tokenEstimates.largestMessages
      .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
      .slice(0, 5)
      .forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.role}] 消息#${msg.index}: ${msg.estimatedTokens.toLocaleString()} tokens`);
      });
  }
  
  return analysis;
}

// 执行
const chatId = process.argv[2] || 'bpDhLIQXoI8JEDoL2gn_r';
const userId = process.argv[3] || '_YiifqRx8vbRQveygKwv6';

fetchAndAnalyzeChat(chatId, userId);