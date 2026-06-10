# Relationship Event Log v1.2 合约

## 目标

在现有"信任72%"的数字基础上，增加"为什么变成72%"的原因追踪。

角色不再只知道数字，而是知道：
- "你最近向他倾诉过压力" → 信任+2
- "你和他聊了日常" → 亲密+1

## 1. DB Schema (storage.js init() 中新增)

```sql
CREATE TABLE IF NOT EXISTS relationship_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  char_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  dimension TEXT NOT NULL,
  change INTEGER NOT NULL DEFAULT 0,
  reason TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rel_evt ON relationship_events(char_id, user_id, created_at);
```

dimension 取值: 'trust' | 'respect' | 'closeness' | 'dependency'

## 2. memory.js 新增函数

```js
// 记录一次关系变化事件
recordRelationEvent(charId, userId, dimension, change, reason)
  // dimension: 'trust'|'respect'|'closeness'|'dependency'
  // change: int (+1,+2,-1等)
  // reason: 简短中文描述(≤30字)，如"用户透露了内心脆弱"
  // 调用 storage.run + storage.save()

// 查询最近的关系变化事件
getRelationEvents(charId, userId, limit)
  // 返回: [{dimension, change, reason, created_at}]
  // 按 created_at 倒序
```

## 3. prompts.js buildCharPrompt 修改

在现有的 `dimSection`（【关系维度】进度条）之后、`episSection`（【经历】）之前，插入 `relEventSection`。

```js
let relEventSection = '';
const relEvents = memory.getRelationEvents(charId, userId, 5);
if (relEvents && relEvents.length > 0) {
  const lines = relEvents.map(e =>
    `- ${dimName(e.dimension)}${e.change > 0 ? '+' : ''}${e.change}: ${e.reason}`
  ).join('\n');
  relEventSection = `\n\n【最近关系变化】\n${lines}`;
}
// dimName: trust→信任, respect→尊重, closeness→亲密, dependency→依赖
```

示例输出:
```
【最近关系变化】
- 信任+2: 用户透露了害怕失败
- 亲密+1: 你们聊了日常
- 尊重+2: 用户认真请教技术问题
```

## 4. chat.js POST /chat 修改

在 keywordFallback 返回 deltas 后（约第31行），为每个非零维度记录事件：

```js
const deltas = memory.keywordFallback(message);
// 新增: 记录关系变化原因
const dimNames = { trust: '信任', respect: '尊重', closeness: '亲密', dependency: '依赖' };
for (const [dim, val] of Object.entries(deltas)) {
  if (val !== 0) {
    const reason = buildReason(dim, val, message);
    memory.recordRelationEvent(charId, uid, dim, val, reason);
  }
}
```

`buildReason(dim, val, message)` 辅助函数：
- trust: 取用户消息前20字，如 +2 → "用户主动分享: [消息片段]"
- respect: "用户认真讨论问题"
- closeness: "日常闲聊"
- dependency: "用户寻求帮助"
- 如果消息>20字，截断加"…"

### 注意
- recordRelationEvent 是同步操作，不需要 await
- 不阻塞 API 回复
- 保留所有现有逻辑不变

## 5. 不改动的部分
- keywordFallback 函数本身不改
- analyzeMessage 函数不改（已废弃但保留）
- group.js 不改
- regenerate 路由不改
