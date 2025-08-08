// 测试自定义 OpenAI 配置
// 运行: node test-custom-openai.js

// 设置测试用的 API Key
process.env.OPENAI_API_KEY = "sk-3xe3j73Get55NG7k28E53e8a6bE44aAaAb82C1021c48D137";

// 测试直接调用 API
async function testDirectAPI() {
  console.log("测试直接调用 apiyi.com API...");
  
  try {
    const response = await fetch('https://api.apiyi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: '你好，请简单介绍一下你自己' }
        ],
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API 错误:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ API 调用成功!');
    console.log('响应:', data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ API 调用失败:', error);
    return false;
  }
}

// 运行测试
console.log('='.repeat(50));
console.log('自定义 OpenAI API 测试');
console.log('='.repeat(50));
console.log('API Key:', process.env.OPENAI_API_KEY);
console.log('Base URL: https://api.apiyi.com/v1');
console.log('='.repeat(50));

testDirectAPI().then(success => {
  if (success) {
    console.log('\n✅ 所有测试通过！');
    console.log('\n使用说明:');
    console.log('1. 在应用中点击侧边栏的 Settings 图标');
    console.log('2. 选择 "API Keys"');
    console.log('3. 在 "OpenAI API Key" 输入框中粘贴: sk-3xe3j73Get55NG7k28E53e8a6bE44aAaAb82C1021c48D137');
    console.log('4. 点击 "Save Keys"');
    console.log('5. 在模型选择器中选择 "Claude Sonnet 4"');
    console.log('6. 开始对话！');
  } else {
    console.log('\n❌ 测试失败，请检查 API Key 是否有效');
  }
});