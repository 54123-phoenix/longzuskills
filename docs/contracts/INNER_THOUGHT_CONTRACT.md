# T-011 内心独白合约

## 方案
零额外 API 调用。在主 Prompt 中加入"先想后说"的格式约束，AI 一次输出包含内心独白和回复。解析后只显示回复，独白存为角色状态。

## 1. prompts.js buildCharPrompt

在 dna 之后追加 thoughtInstruction:

```js
const THOUGHT_INSTRUCTION = `\n\n【内心机制】回复前先在心里快速想一句（用<>包裹），然后正常回话。内心想法只反映你的真实感受，不要直接说出来。示例：<他好像需要帮助> 你怎么了。`;
```

拼接: `${ch.system}${dna}${THOUGHT_INSTRUCTION}${quoteSection}${eventSection}...`

## 2. memory.js 新增

```js
function saveLastThought(charId, userId, thought) {
  storage.run('UPDATE character_state SET last_thought=?, updated_at=? WHERE char_id=? AND user_id=?', [thought, Date.now(), charId, userId || 'default']);
  storage.save();
}
function getLastThought(charId, userId) {
  const r = storage.get('SELECT last_thought FROM character_state WHERE char_id=? AND user_id=?', [charId, userId || 'default']);
  return r?.last_thought || '';
}
```

导出。

## 3. storage.js
character_state 表追加列:
```sql
ALTER TABLE character_state ADD COLUMN last_thought TEXT DEFAULT '';
```
(用 try/catch 包裹，避免重复 ALTER TABLE 报错)

## 4. chat.js POST /chat

在获取 reply 后，解析并去除内心独白，存储:

```js
const reply = await ai.call(msgs, { model: model || 'qwen-plus', ... });
let thought = '';
let replyText = reply || '';
const thoughtMatch = replyText.match(/^<([^>]+)>\s*/);
if (thoughtMatch) {
  thought = thoughtMatch[1];
  replyText = replyText.replace(/^<[^>]+>\s*/, '');
}
if (thought) {
  memory.saveLastThought(charId, uid, thought);
}
replyText = memory.enforceConstraints(charId, replyText) || '……';
```

## 5. stateSection (prompts.js)
在 stateSection 中加入上次独白:
```js
const lastThought = memory.getLastThought(charId, userId);
if (lastThought) {
  stateSection += `\n刚才心里想: "${lastThought}"`;
}
```

## 6. 不改动
- ai.js、group.js、seed.js、前端 不改
