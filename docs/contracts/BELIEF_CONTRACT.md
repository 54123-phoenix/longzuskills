# Belief Distillation v2.0 合约

## 核心洞察

当前蒸馏层次:
```
事实(Fact)  →  知道用户是做什么的
经历(Episode) → 知道用户发生了什么
情绪(Emotion) → 知道用户的感受
信念(Belief) ← 缺失: 理解用户为什么这样做
```

信念是前几层的"为什么"的聚合。比如:
- "成长 > 赚钱" (价值观)
- "害怕让别人失望" (自我认知)
- "技术应该开放" (世界观)

加入信念后，角色不再只是"记住你说过什么"，而是"理解你是什么样的人"。

## 1. DB Schema (storage.js)

```sql
CREATE TABLE IF NOT EXISTS beliefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  char_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  belief TEXT NOT NULL,
  category TEXT DEFAULT '价值观',
  confidence REAL DEFAULT 0.5,
  source TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bel ON beliefs(char_id, user_id, category);
```

category: '价值观' | '自我认知' | '世界观' | '偏好' | '恐惧'

## 2. memory.js

```js
setBelief(charId, userId, belief, category, confidence)
  // UPSERT by belief text: if same belief exists, update confidence

getBeliefs(charId, userId, limit) → [{belief, category, confidence}]
```

## 3. ai.js

```js
extractBeliefs(messages) → [{belief, category, confidence}]
```

System prompt:
```
从对话中提取用户的核心信念和价值观。信念是用户反复表达的深层原则、人生哲学、自我认知。
不要提取表面偏好(如"喜欢咖啡")，要提取反映人格的原则(如"认为简单胜过复杂")。

类别: 价值观(人生原则)、自我认知(如何看待自己)、世界观(如何看待世界)、偏好(深层倾向)、恐惧(害怕什么)

返回JSON数组: [{"belief":"信念描述","category":"类别","confidence":0.1-1.0}]
最多5条。只提取明确表达的信念，不要推测。
```

## 4. prompts.js buildCharPrompt

在 episSection 之后、memSection 之前插入 beliefSection:

```js
let beliefSection = '';
const beliefs = memory.getBeliefs(charId, userId, 8);
if (beliefs && beliefs.length > 0) {
  const catMap = { '价值观': '💡', '自我认知': '🪞', '世界观': '🌍', '偏好': '❤️', '恐惧': '😨' };
  const lines = beliefs.map(b =>
    `- ${catMap[b.category]||''} ${b.belief} (确信:${Math.floor(b.confidence*100)}%)`
  ).join('\n');
  beliefSection = `\n\n【对${userId}的理解】\n${lines}`;
}
```

最终拼接顺序: system → stateSection → "正在和xx聊天" → dimSection → relEventSection → episSection → beliefSection → memSection → relSection

## 5. prompts.js 新增 extractAndSaveBeliefs

```js
async function extractAndSaveBeliefs(charId, userId, recentMessages) {
  try {
    const beliefs = await ai.extractBeliefs(recentMessages);
    for (const b of beliefs) {
      if (b.belief && b.confidence > 0.3) {
        memory.setBelief(charId, userId, b.belief, b.category || '价值观', b.confidence);
      }
    }
  } catch (e) { /* best-effort */ }
}
```

导出。

## 6. chat.js POST /chat

在 episode 提取的同一位置（shouldExtract 条件内），追加:

```js
if (shouldExtract) {
  prompts.extractAndSaveEpisodes(charId, uid, [recentTexts]);
  prompts.extractAndSaveBeliefs(charId, uid, [recentTexts]);  // 新增
  prompts.extractAndSaveMemories(charId, uid, [recentTexts]);
}
```

三个提取 fire-and-forget 并行，共享同一 throttle。

## 7. 效果对比

旧（没有信念层）:
```
【关于用户的经历】
- 昨天 讨论了技术选型（情绪：投入）
【关于用户的长期记忆】
- 职业:软件工程师
```

新（有信念层）:
```
【关于用户的经历】
- 昨天 讨论了技术选型（情绪：投入）
【对用户的理解】
- 💡 成长比赚钱更重要 (确信:85%)
- 🪞 害怕让别人失望 (确信:70%)
- 🌍 技术应该开放共享 (确信:60%)
【关于用户的长期记忆】
- 职业:软件工程师
```

角色现在能基于对用户的理解给出回应，而非仅仅复读记忆。
