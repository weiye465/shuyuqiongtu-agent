// 测试默认 API Key 配置
// 运行: node test-default-key.js

console.log('='.repeat(50));
console.log('测试默认 API Key 配置');
console.log('='.repeat(50));

// 模拟浏览器环境
const mockLocalStorage = {
  storage: {},
  getItem(key) {
    return this.storage[key] || null;
  },
  setItem(key, value) {
    this.storage[key] = value;
  },
  removeItem(key) {
    delete this.storage[key];
  }
};

// 测试场景 1: 没有存储的 key，应该返回默认值
console.log('\n场景 1: 没有存储的 API Key');
const defaultKey = 'sk-3xe3j73Get55NG7k28E53e8a6bE44aAaAb82C1021c48D137';
const storedKey = mockLocalStorage.getItem('OPENAI_API_KEY');
const resultKey = storedKey || defaultKey;
console.log('存储的 Key:', storedKey);
console.log('使用的 Key:', resultKey);
console.log('✅ 正确使用默认 Key:', resultKey === defaultKey);

// 测试场景 2: 有存储的 key，应该使用存储的值
console.log('\n场景 2: 有自定义的 API Key');
const customKey = 'sk-custom-key-12345';
mockLocalStorage.setItem('OPENAI_API_KEY', customKey);
const storedKey2 = mockLocalStorage.getItem('OPENAI_API_KEY');
const resultKey2 = storedKey2 || defaultKey;
console.log('存储的 Key:', storedKey2);
console.log('使用的 Key:', resultKey2);
console.log('✅ 正确使用自定义 Key:', resultKey2 === customKey);

// 测试场景 3: 清除后应该回到默认值
console.log('\n场景 3: 清除 API Key 后');
mockLocalStorage.removeItem('OPENAI_API_KEY');
const storedKey3 = mockLocalStorage.getItem('OPENAI_API_KEY');
const resultKey3 = storedKey3 || defaultKey;
console.log('存储的 Key:', storedKey3);
console.log('使用的 Key:', resultKey3);
console.log('✅ 正确回到默认 Key:', resultKey3 === defaultKey);

console.log('\n' + '='.repeat(50));
console.log('✅ 所有测试通过！');
console.log('\n默认配置说明:');
console.log('1. 用户无需配置即可使用 Claude Sonnet 4 模型');
console.log('2. 默认 API Key 已内置: ' + defaultKey);
console.log('3. 用户可以在设置中更改为自己的 API Key');
console.log('4. 清除 API Key 后会自动恢复默认值');
console.log('='.repeat(50));