// 分析 toolInvocation 对象结构的脚本

const exampleParts = [
  { type: 'text', text: '现在我来生成专门针对代理毛利率分析的详细HTML报告：' },
  { 
    type: 'tool-invocation', 
    toolInvocation: {
      toolName: 'execute_sql',
      state: 'call',  // 'call' | 'result'
      args: {
        query: "SELECT * FROM table LIMIT 10"
      },
      // result 字段只在 state === 'result' 时存在
      result: {
        content: [
          {
            type: "text",
            text: "查询结果JSON字符串"
          }
        ],
        isError: false
      }
    }
  },
];

// 基于 Vercel AI SDK 的 toolInvocation 结构分析
console.log(`
=== toolInvocation 对象结构分析 ===

toolInvocation 包含以下关键信息：

1. **toolName** (string)
   - 工具名称，如 'execute_sql', 'import_file', 'list_tables' 等
   - 用于标识调用的是哪个 MCP 工具

2. **state** (string)
   - 'call': 表示正在调用工具
   - 'result': 表示工具已返回结果
   - 用于跟踪工具调用的状态

3. **args** (object)
   - 传递给工具的参数
   - 对于 execute_sql，通常包含 { query: "SQL语句" }
   - 对于 import_file，包含 { file_path: "URL", table_name: "表名" }

4. **result** (object) - 仅在 state === 'result' 时存在
   - content: 工具返回的内容数组
   - isError: 是否发生错误
   - 包含实际的查询结果或错误信息

=== 你看到的问题分析 ===

当 AI 说"现在我来生成HTML报告"后，仍然有 tool-invocation：
- 这表明 AI 混淆了阶段
- 在应该生成 HTML 时，仍在调用 execute_sql
- toolInvocation 中的 toolName 很可能是 'execute_sql'

=== 解决方案 ===

1. 系统提示词已更新，明确区分两个阶段
2. 过滤历史记录中的工具调用，减少混淆
3. 在生成阶段禁止所有 MCP 工具调用

=== 调试建议 ===

可以在前端添加日志来查看完整的 toolInvocation 对象：
\`\`\`javascript
if (part.type === 'tool-invocation') {
  console.log('Tool Invocation Details:', {
    toolName: part.toolInvocation.toolName,
    state: part.toolInvocation.state,
    args: part.toolInvocation.args,
    hasResult: 'result' in part.toolInvocation
  });
}
\`\`\`
`);

// 模拟真实场景的 toolInvocation
const problematicExample = {
  type: 'tool-invocation',
  toolInvocation: {
    toolName: 'execute_sql',
    state: 'call',
    args: {
      query: `SELECT 
        销售代理,
        COUNT(*) as 订单数量,
        SUM(销售收入) as 总销售收入,
        SUM(销售毛利) as 总毛利,
        ROUND(SUM(销售毛利) * 100.0 / SUM(销售收入), 2) as 毛利率
      FROM mcp_088b0181_a6779a03_5f9e_4e17_82e1_3f87b1a58a32
      WHERE 销售代理 IS NOT NULL 
      GROUP BY 销售代理
      ORDER BY 毛利率 DESC`
    }
  }
};

console.log('\n=== 问题示例 ===');
console.log('当 AI 说"现在我来生成HTML报告"时，parts 中出现：');
console.log(JSON.stringify(problematicExample, null, 2));
console.log('\n这说明 AI 在应该输出 HTML 时，仍在执行 SQL 查询。');