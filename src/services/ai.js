const AI_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

let apiKey;

function init(key) { apiKey = key; }

async function call(messages, options = {}) {
  const { model = 'qwen-plus', temperature = 0.85, maxTokens = 250, retries = 2 } = options;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(25000)
      });

      if (!r.ok) {
        if (r.status === 429 || r.status >= 500) {
          lastError = new Error(`API ${r.status}`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
        }
        return null;
      }

      const d = await r.json();
      const content = d.choices?.[0]?.message?.content?.trim();
      return content || null;

    } catch (e) {
      lastError = e;
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        if (attempt < retries) {
          console.log(`AI retry ${attempt + 1}/${retries} after timeout`);
          await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)));
          continue;
        }
      }
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
    }
  }
  if (lastError) console.error(`AI call failed after ${retries + 1} attempts: ${lastError.message}`);
  return null;
}

async function extractMemories(messages) {
  const msgs = [
    { role: 'system', content: '从以下对话中提取关于用户的关键事实和偏好。返回JSON数组，每个元素格式：{"key":"事实主题","value":"具体内容","confidence":0.1-1.0}。只提取明确提到的信息，不要推测。最多5条。' },
    { role: 'user', content: messages.join('\n') }
  ];
  const res = await call(msgs, { model: 'qwen-plus', temperature: 0.2, maxTokens: 300 });
  try { return JSON.parse(res?.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
}

async function extractEpisodes(messages) {
  const msgs = [
    { role: 'system', content: '从以下对话中提取关于用户的重要经历。提取的是"发生了什么+用户为什么这样做+用户的情绪"，而不是简单的事实属性。返回JSON数组，每个元素格式：{"event":"事件描述","reason":"用户这么做的原因或动机","emotion":"用户的情绪状态","importance":0.1-1.0}。只提取明确提到的信息，不要推测。最多5条。importance越高代表越能反映用户的人格或价值观。' },
    { role: 'user', content: Array.isArray(messages) ? messages.map(m => typeof m === 'string' ? m : m.content).join('\n') : messages.join('\n') }
  ];
  const res = await call(msgs, { model: 'qwen-plus', temperature: 0.2, maxTokens: 400 });
  try { return JSON.parse(res?.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
}

module.exports = { init, call, extractMemories, extractEpisodes };
