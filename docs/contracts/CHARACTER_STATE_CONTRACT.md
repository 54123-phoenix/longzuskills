# Character Internal State Machine v1.4 合约

## 目标

角色不再只是"根据Prompt回话"，而是拥有自己的内心状态：
- 心情(mood): 开心/平静/低落
- 压力(stress): 0-100
- 精力(energy): 0-100
- 好感(favor): 对当前用户的亲近度 0-100

状态随对话自然变化，影响角色回应的语气和内容。

## 1. DB Schema (storage.js init() 中新增)

```sql
CREATE TABLE IF NOT EXISTS character_state (
  char_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default',
  mood TEXT DEFAULT '平静',
  stress INTEGER DEFAULT 0,
  energy INTEGER DEFAULT 80,
  favor INTEGER DEFAULT 20,
  updated_at INTEGER DEFAULT 0,
  PRIMARY KEY(char_id, user_id)
);
```

mood 可选值: '开心' | '平静' | '低落' | '好奇' | '担心'

## 2. memory.js 新增函数

```js
// 获取角色状态，无则创建默认
getCharState(charId, userId) → {mood, stress, energy, favor}
  // SELECT 无结果时 INSERT 默认值再返回

// 更新角色状态（部分字段）
updateCharState(charId, userId, updates)
  // updates: {mood?, stress?, energy?, favor?}
  // UPDATE 已有字段，不覆盖未传的字段
```

## 3. memory.js 新增 stateAnalyzer 函数（纯关键词，零API调用）

```js
function analyzeCharState(charId, userMessage, charReply) {
  const state = { moodDelta: 0, stressDelta: 0, energyDelta: 0, favorDelta: 0 };

  // 用户鼓励/夸奖 → 心情↑ 精力↑ 好感↑
  if (/(加油|很棒|厉害|佩服|崇拜|喜欢|谢谢|感谢)/.test(userMessage)) {
    state.moodDelta = 1; state.energyDelta = 3; state.favorDelta = 2;
  }
  // 用户倾诉/求助 → 角色更投入，精力↓
  if (/(帮帮我|怎么办|好累|难过|不开心|压力|害怕|迷茫)/.test(userMessage)) {
    state.favorDelta = 1; state.energyDelta = -2; state.stressDelta = 2;
  }
  // 用户生气/抱怨 → 压力↑
  if (/(烦|讨厌|滚|无语|气死|够了|闭嘴)/.test(userMessage)) {
    state.stressDelta = 3; state.moodDelta = -1;
  }
  // 闲聊日常 → 轻微好感↑
  if (/(今天|吃了|睡了|哈哈|日常|无聊|周末)/.test(userMessage)) {
    state.favorDelta = 1; state.energyDelta = -1;
  }
  // 角色回复较长 → 精力消耗
  if (charReply && charReply.length > 40) {
    state.energyDelta -= 1;
  }

  return state;
}
```

## 4. prompts.js buildCharPrompt 修改

在 dimSection 之前插入 stateSection:

```js
let stateSection = '';
const st = memory.getCharState(charId, userId);
if (st) {
  const moodMap = { '开心': '😊', '平静': '😐', '低落': '😔', '好奇': '🤔', '担心': '😟' };
  const moodEmoji = moodMap[st.mood] || '';
  stateSection = `\n\n【你当前的状态】\n心情: ${moodEmoji}${st.mood} | 压力: ${'█'.repeat(Math.floor(st.stress/10))} | 精力: ${'█'.repeat(Math.floor(st.energy/10))} | 好感: ${st.favor}%
注意: 你的回复应该自然反映当前心情。精力低时话会变少。压力高时可能不耐烦。好感高时更主动。`;
}
```

拼接顺序: `${ch.system}${stateSection}\n正在和"${userId}"聊天...`

## 5. chat.js POST /chat 修改

在 keywordFallback 更新 profile 之后，新增状态更新:

```js
// 更新角色内心状态
const charState = memory.getCharState(charId, uid);
const stateDelta = memory.analyzeCharState(charId, message, replyText);
memory.updateCharState(charId, uid, {
  mood: stateDelta.moodDelta > 0 ? '开心' : stateDelta.moodDelta < 0 ? '低落' : '平静',
  stress: Math.min(100, Math.max(0, charState.stress + stateDelta.stressDelta)),
  energy: Math.min(100, Math.max(0, charState.energy + stateDelta.energyDelta)),
  favor: Math.min(100, Math.max(0, charState.favor + stateDelta.favorDelta))
});
```

## 6. 边界处理
- 下次对话时，如果精力过低(<10)，系统可自动恢复 +20（时间流逝）
- 压力超过 80 时，角色偶尔会表现出不耐烦
- 好感超过 70 时，角色会更主动关心用户

## 7. 不改动的部分
- group.js 不改
- regenerate 路由不改
- 所有前端文件不改
