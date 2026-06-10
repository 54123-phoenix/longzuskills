# Episode Memory 数据契约 v1.0

## 1. 数据库层 (storage.js)

在 `storage.js` 的 `init()` 方法中，新增 `episodes` 表：

```sql
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  char_id TEXT,
  user_id TEXT,
  event TEXT NOT NULL,
  reason TEXT,
  emotion TEXT,
  importance REAL DEFAULT 0.5,
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0,
  UNIQUE(char_id, user_id)
);
```

索引：
- `char_id` 用于关联角色
- `user_id` 用于关联用户

### 2. 内存层 (memory.js)

新增 `setEpisode()` / `getEpisodes()` 函数：

```js
function setEpisode(charId, userId, event, reason, emotion, importance) {
  const episode = {
    event,
    reason,
    emotion,
    importance,
  };
}
```

### 3. AI 蒸馏层 (ai.js)

保留旧 `extractMemories` 函数，不删除。

### 4. Prompt 构建层 (prompts.js)

在 `prompts.js` 的 `buildCharPrompt` 方法中，新增 `episodes` 段落格式：

```
【关于${userId}的经历】
- ${event}（原因：${reason}，情绪：${emotion}）
```

## 5. 集成串联 (chat.js)

在 `/chat` 路由中调用 `extractEpisodes` 替代 `extractMemories`：

```js
// 记忆节流逻辑保持不变
const MEMORY_EXTRACT_INTERVAL = 5;
```

## 6. 路由集成 (chat.js)

```js
function setEpisode(charId, userId) {
  const episode = {
    event,
    reason,
    emotion,
    importance,
  };
}
```

### 7. 未来扩展

- 用户可回滚：
  - 可回滚到旧逻辑
  - 可回退
  - 可继续

---

现在我开三个子 Agent 并行推进 Phase 1。

Phase 1: Agent A 存储层 — 我先写合约。<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="filePath" string="true">D:\Desktop\dragon-chat\EPISODE_CONTRACT.md