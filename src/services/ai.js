const AI_URL = 'https://api.deepseek.com/v1/chat/completions';

let apiKey;

function init(key) { apiKey = key; }

async function call(messages, options = {}) {
  const { model = 'deepseek-chat', temperature = 0.85, maxTokens = 250, retries = 2 } = options;
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
        // DeepSeek 余额不足 / 额度用尽
        if (r.status === 402 || r.status === 403) {
          let body = null;
          try { body = await r.json(); } catch {}
          const errMsg = body?.error?.message || '';
          if (/insufficient.*quota|balance|credit|额度|余额/.test(errMsg) || r.status === 402) {
            return { error: 'insufficient_quota', message: 'AI 额度已用完，请充值后继续使用' };
          }
        }
        if (r.status === 429 || r.status >= 500) {
          lastError = new Error(`API ${r.status}`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            continue;
          }
        }
        return { error: 'api_error', message: 'AI 服务暂时不可用' };
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
  return { error: 'api_error', message: 'AI 服务暂时不可用' };
}

function isQuotaError(result) {
  return result && typeof result === 'object' && result.error === 'insufficient_quota';
}

function isApiError(result) {
  return result && typeof result === 'object' && result.error === 'api_error';
}

async function extractMemories(messages) {
  const msgs = [
    { role: 'system', content: '从以下对话中提取关于用户的关键事实和偏好。返回JSON数组，每个元素格式：{"key":"事实主题","value":"具体内容","confidence":0.1-1.0}。只提取明确提到的信息，不要推测。最多5条。' },
    { role: 'user', content: messages.join('\n') }
  ];
  const res = await call(msgs, { model: 'deepseek-chat', temperature: 0.2, maxTokens: 300 });
  if (isQuotaError(res) || isApiError(res)) return [];
  try { return JSON.parse(res?.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
}

async function extractEpisodes(messages) {
  const msgs = [
    { role: 'system', content: '从以下对话中提取关于用户的重要经历。提取的是"发生了什么+用户为什么这样做+用户的情绪"，而不是简单的事实属性。返回JSON数组，每个元素格式：{"event":"事件描述","reason":"用户这么做的原因或动机","emotion":"用户的情绪状态","importance":0.1-1.0}。只提取明确提到的信息，不要推测。最多5条。importance越高代表越能反映用户的人格或价值观。' },
    { role: 'user', content: Array.isArray(messages) ? messages.map(m => typeof m === 'string' ? m : m.content).join('\n') : messages.join('\n') }
  ];
  const res = await call(msgs, { model: 'deepseek-chat', temperature: 0.2, maxTokens: 400 });
  if (isQuotaError(res) || isApiError(res)) return [];
  try { return JSON.parse(res?.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
}

async function extractBeliefs(messages) {
  const msgs = [
    { role: 'system', content: '从对话中提取用户的核心信念和价值观。信念是用户反复表达的深层原则、人生哲学、自我认知。不要提取表面偏好，要提取反映人格的原则。类别: 价值观(人生原则)、自我认知(如何看待自己)、世界观(如何看待世界)、偏好(深层倾向)、恐惧(害怕什么)。返回JSON数组: [{"belief":"信念描述","category":"类别","confidence":0.1-1.0}]。最多5条。只提取明确表达的信念。' },
    { role: 'user', content: messages.join('\n') }
  ];
  const res = await call(msgs, { model: 'deepseek-chat', temperature: 0.2, maxTokens: 400 });
  if (isQuotaError(res) || isApiError(res)) return [];
  try { return JSON.parse(res?.match(/\[[\s\S]*\]/)?.[0] || '[]'); } catch { return []; }
}

module.exports = { init, call, extractMemories, extractEpisodes, extractBeliefs, isQuotaError, isApiError };
