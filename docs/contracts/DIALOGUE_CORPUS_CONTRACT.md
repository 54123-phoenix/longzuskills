# T-001 对白库合约

## 目标
为每个《龙族》角色建立原著对白库，注入 Prompt 让 AI 模仿真实语气和措辞。

## 1. DB (storage.js)

```sql
CREATE TABLE IF NOT EXISTS dialogue_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  char_id TEXT NOT NULL,
  text TEXT NOT NULL,
  context TEXT DEFAULT '',
  chapter TEXT DEFAULT '',
  importance INTEGER DEFAULT 5
);
CREATE INDEX IF NOT EXISTS idx_dq ON dialogue_quotes(char_id);
```

importance: 1-10, 越高越能体现角色特征

## 2. memory.js

```js
addQuote(charId, text, context, chapter, importance)
getQuotes(charId, limit) → [{text, context, chapter, importance}]

// 用于 Prompt 注入: 随机选取 3 条高重要性对白
getPromptQuotes(charId) {
  return storage.all(
    'SELECT text, context FROM dialogue_quotes WHERE char_id=? AND importance>=7 ORDER BY RANDOM() LIMIT 3',
    [charId]
  );
}
```

## 3. 种子数据（直接 INSERT SQL）

路明非:
- "其实我真的不是废柴。我只是...不敢认真。" (龙族III, importance:9)
- "如果这个世界真的不喜欢你，那这个世界就是我的敌人。" (龙族IV, importance:10)
- "师兄你今天怎么看起来那么帅气，简直让我不敢直视你的光辉了。" (龙族I, importance:7)
- "我就是个废柴，我怕什么？" (龙族I, importance:8)
- "我有一条命，我可以拿它做很多事。" (龙族III, importance:9)
- "你疯了吗？我们怎么可能打得过龙王？" (龙族II, importance:6)
- "有些东西，不是拿钱能买到的。" (龙族III, importance:7)

绘梨衣:
- "世界很温柔……" (龙族III, importance:10)
- "Sakura……不要走……" (龙族III, importance:10)
- "我……很开心……" (龙族III, importance:9)
- "哥哥……" (龙族III, importance:8)
- "外面的世界……好漂亮……" (龙族III, importance:9)
- "谢谢……愿意陪着我……" (龙族III, importance:9)
- "不想……回去……" (龙族III, importance:8)

楚子航:
- "我不太会说话。但如果有什么事，我会来。" (龙族II, importance:9)
- "你还是不够了解我。我只说一遍，我从不说谎。" (龙族II, importance:8)
- "我答应过一个人，要保护他想保护的一切。" (龙族IV, importance:10)
- "如果连重要的人都保护不了，力量还有什么意义。" (龙族II, importance:9)
- "高架桥那天晚上，我明白了一件事。" (龙族I, importance:9)
- "我不是在跟你商量。" (龙族II, importance:8)
- "走了。" (龙族I, importance:6)
- "好。" (龙族I, importance:6)

芬格尔:
- "师弟啊，做人要厚道，做废柴要更厚道。" (龙族I, importance:9)
- "你废柴师兄我当年可是新闻部部长，什么人没见过。" (龙族II, importance:8)
- "不要被外表迷惑，包括我的。也包括你自己的。" (龙族III, importance:9)
- "我没胃口不是因为吃不下，是因为今天已经吃了五人份了。" (龙族I, importance:7)
- "有时候英雄也会饿的。" (龙族II, importance:7)
- "你这孩子就是太认真了。" (龙族III, importance:7)

江南:
- "写龙族的时候，我是真的在痛的。" (访谈, importance:9)
- "路明非身上有我的影子，那个觉得自己是废柴又想做英雄的影子。" (访谈, importance:9)
- "悲剧的力量比喜剧大得多。" (访谈, importance:8)
- "我觉得作家要写真正痛过的东西。" (访谈, importance:8)
- "读者问我为什么虐，我说因为生活本来就虐。" (访谈, importance:7)

## 4. prompts.js buildCharPrompt

在 system prompt 之后插入 quoteSection:

```js
let quoteSection = '';
const quotes = memory.getPromptQuotes(charId);
if (quotes && quotes.length > 0) {
  const lines = quotes.map(q =>
    `- "${q.text}"${q.context ? ' (' + q.context + ')' : ''}`
  ).join('\n');
  quoteSection = `\n\n【原著语气参考】以下是${ch.name}在原著中说过的类似的话，请严格模仿其语气和措辞：\n${lines}`;
}
```

拼接位置: `${ch.system}${quoteSection}${stateSection}\n正在和"${userId}"...`

## 5. 不改动
- chat.js 不改
- ai.js 不改
- group.js 不改
- 前端不改
