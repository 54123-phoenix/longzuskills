# Time-Layered Memory v1.3 合约

## 目标

让角色知道"什么时候"发生的事，而非把所有经历当同样新鲜的记忆。

## 无需新建表

episodes 表已有 `created_at` 字段，直接利用。

## 1. memory.js 修改

### 修改 getEpisodes 函数
当前签名: `getEpisodes(charId, userId, limit)` → 取最近 limit 条
改为: 支持时间过滤

```js
function getEpisodes(charId, userId, limit) {
  // 不变，取最近 limit 条（向前兼容）
  return storage.all('SELECT event, reason, emotion, importance, created_at FROM episodes WHERE char_id=? AND user_id=? ORDER BY created_at DESC LIMIT ?', [charId, userId || 'default', limit || 10])
    .map(r => ({ event: r.event, reason: r.reason, emotion: r.emotion, importance: r.importance, created_at: r.created_at }));
}
```

### 新增 getRecentEpisodes
```js
function getRecentEpisodes(charId, userId, days) {
  const since = Date.now() - (days || 7) * 86400000;
  return storage.all('SELECT event, reason, emotion, importance, created_at FROM episodes WHERE char_id=? AND user_id=? AND created_at >= ? ORDER BY created_at DESC LIMIT 10', [charId, userId || 'default', since])
    .map(r => ({ event: r.event, reason: r.reason, emotion: r.emotion, importance: r.importance, created_at: r.created_at }));
}
```

### 新增 timeLabel 工具函数
```js
function timeLabel(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days/7)}周前`;
  return '更早';
}
```

导出 getRecentEpisodes, timeLabel。

## 2. prompts.js buildCharPrompt 修改

episSection 改为使用 `getRecentEpisodes`（最近7天），并添加时间标签：

```js
let episSection = '';
const recentEps = memory.getRecentEpisodes(charId, userId, 7);
if (recentEps && recentEps.length > 0) {
  const lines = recentEps.map(e =>
    `- ${memory.timeLabel(e.created_at)} ${e.event}（情绪：${e.emotion}）`
  ).join('\n');
  episSection = `\n\n【最近7天的经历】\n${lines}`;
}

// 如果最近7天为空，回退到取最近10条
if (!episSection) {
  const allEps = memory.getEpisodes(charId, userId, 5);
  if (allEps && allEps.length > 0) {
    const lines = allEps.map(e =>
      `- ${memory.timeLabel(e.created_at)} ${e.event}（情绪：${e.emotion}）`
    ).join('\n');
    episSection = `\n\n【之前的经历】\n${lines}`;
  }
}
```

## 3. 不改动的部分
- storage.js 不改
- ai.js 不改  
- chat.js 不改
- episodes 表结构不改
- extractAndSaveEpisodes 不改
- 所有前端文件不改

## 4. 效果对比

旧:
```
【关于test的经历】
- 决定独立开发Agent框架（原因：想深入理解，情绪：期待）
- 讨论了技术方案（原因：统一技术栈，情绪：投入）
```

新:
```
【最近7天的经历】
- 昨天 讨论了技术方案（情绪：投入）
- 3天前 决定独立开发Agent框架（情绪：期待）
【之前的经历】
- 2周前 学习了Python（情绪：好奇）
```
