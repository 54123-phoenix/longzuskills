const AI_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

let apiKey;

function init(key) { apiKey = key; }

async function call(messages, options = {}) {
  const { model = 'qwen-plus', temperature = 0.85, maxTokens = 250 } = options;
  try {
    const r = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) { return null; }
}

async function extractMemories(messages) {
  const msgs = [
    { role: 'system', content: '从以下对话中提取关于用户的关键事实和偏好。返回JSON数组，每个元素格式：{"key":"事实主题","value":"具体内容","confidence":0.1-1.0}。只提取明确提到的信息，不要推测。最多5条。' },
    { role: 'user', content: messages.join('\n') }
  ];
  const res = await call(msgs, { model: 'qwen-plus', temperature: 0.2, maxTokens: 300 });
  try { return JSON.parse(res?.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
}

module.exports = { init, call, extractMemories };
