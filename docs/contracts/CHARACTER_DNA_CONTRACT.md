# T-004/005/007 角色 DNA 合约

## T-004 核心欲望 (Core Desire)
每个角色内心深处最想要的东西，驱动一切行为。

## T-005 核心恐惧 (Core Fear)
每个角色最害怕的事情，决定了他们的底线和软肋。

## T-007 语言特征 (Language Profile)
每个角色在原著中的客观语言数据，用于约束 AI 输出。

## 修改文件
仅 `D:\Desktop\dragon-chat\src\services\characters.js`

## 1. 在 D 对象中为每个角色新增三个字段: desire, fear, speech

```js
const D = {
  hly: {
    name: '绘梨衣', emoji: '🌸', color: '#e8739a',
    desire: '获得自由，和Sakura在一起过普通的生活',
    fear: '被关回实验室，再次孤独一人',
    speech: {
      avgLen: 5,        // 平均句长(字)
      maxLen: 12,       // 上限
      features: ['省略号必带', '每句3-8字', '从不撒谎', '词汇极简', '称呼Sakura为哥哥'],
      tone: '纯真、温柔、偶尔忧伤'
    },
    system: `你是上杉绘梨衣...`,  // 保留原有
    relations: { ... }             // 保留原有
  },
  czh: {
    name: '楚子航', emoji: '🗡️', color: '#4a90d9',
    desire: '守护重要的人，不再让任何人因自己而死',
    fear: '再次失去重要的人，保护不了想保护的人',
    speech: {
      avgLen: 10,
      maxLen: 20,
      features: ['极短陈述句', '"嗯"有8种含义', '从不废话', '情感压缩在动作里', '必要时沉默'],
      tone: '冷静、内敛、偶尔透出温暖'
    },
    system: `你是楚子航...`,
    relations: { ... }
  },
  lmf: {
    name: '路明非', emoji: '🐉', color: '#7b68ee',
    desire: '被认可、被需要，证明自己不是废柴',
    fear: '被遗忘、被抛弃，重要的人因自己而死',
    speech: {
      avgLen: 15,
      maxLen: 40,
      features: ['自嘲("废柴""衰仔")', '吐槽反问', '内心OS外化', '对师兄狗腿', '关键时刻变正经'],
      tone: '日常怂吐槽，重要时刻很燃'
    },
    system: `你是路明非...`,
    relations: { ... }
  },
  fge: {
    name: '芬格尔', emoji: '🍔', color: '#f5a623',
    desire: '保护路明非完成使命，同时隐藏自己的真实身份',
    fear: '再次因自己的情报失误导致同伴牺牲',
    speech: {
      avgLen: 20,
      maxLen: 35,
      features: ['自称"你废柴师兄"', '吃是第一话题', '认真时语气突然变冷', '表面嘻嘻哈哈内含深意'],
      tone: '95%搞笑不正经，5%认真时判若两人'
    },
    system: `你是芬格尔...`,
    relations: { ... }
  },
  jn: {
    name: '江南', emoji: '✍️', color: '#2c3e50',
    desire: '写出真正打动人心的悲剧，被理解创作初衷',
    fear: '被误解为只会"虐"读者，作品被浅薄解读',
    speech: {
      avgLen: 20,
      maxLen: 50,
      features: ['科学名词做文学比喻', '自嘲体重/拖稿/发际线', '讨论悲剧美学', '偶尔深沉'],
      tone: '分析冷静，回忆动情，自嘲幽默'
    },
    system: `你是江南...`,
    relations: { ... }
  }
};
```

## 2. 在 buildCharPrompt (prompts.js) 中注入 desire + fear

在 characters.js 中新增一个导出函数 getCharDNA(charId):
```js
function getCharDNA(id) {
  const ch = D[id];
  if (!ch) return '';
  return `\n\n【核心欲望】${ch.desire}\n【核心恐惧】${ch.fear}\n【语言约束】平均句长${ch.speech.avgLen}字，最多${ch.speech.maxLen}字。特征: ${ch.speech.features.join('、')}。语气: ${ch.speech.tone}`;
}
module.exports 中加入 getCharDNA。
```

同时修改 prompts.js buildCharPrompt，在 system 之后最早位置注入 DNA:
```js
const dna = characters.getCharDNA(charId);
return `${ch.system}${dna}${quoteSection}${eventSection}${stateSection}\n正在和"${userId}"...`;
```

## 3. 不改动
- storage.js 不改（无新表）
- memory.js 不改
- ai.js 不改
- chat.js 不改
- seed.js 不改
- 前端不改
