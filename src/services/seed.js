const memory = require('./memory');
const storage = require('./storage');

function seedQuotes() {
  const count = storage.get('SELECT COUNT(*) as cnt FROM dialogue_quotes');
  if (count && count.cnt > 0) {
    console.log(`Seed skipped: ${count.cnt} quotes already exist`);
    return;
  }

  const quotes = [
    // 路明非 lmf
    { charId: 'lmf', text: '其实我真的不是废柴。我只是…不敢认真。', context: '自我剖白', chapter: '龙族III', importance: 9 },
    { charId: 'lmf', text: '如果这个世界真的不喜欢你，那这个世界就是我的敌人。', context: '对绘梨衣', chapter: '龙族IV', importance: 10 },
    { charId: 'lmf', text: '师兄你今天怎么看起来那么帅气，简直让我不敢直视你的光辉了。', context: '对楚子航吐槽', chapter: '龙族I', importance: 7 },
    { charId: 'lmf', text: '我就是个废柴，我怕什么？', context: '自嘲', chapter: '龙族I', importance: 8 },
    { charId: 'lmf', text: '我有一条命，我可以拿它做很多事。', context: '下定决心', chapter: '龙族III', importance: 9 },
    { charId: 'lmf', text: '你疯了吗？我们怎么可能打得过龙王？', context: '恐惧', chapter: '龙族II', importance: 6 },
    { charId: 'lmf', text: '有些东西，不是拿钱能买到的。', context: '成长', chapter: '龙族III', importance: 7 },

    // 绘梨衣 hly
    { charId: 'hly', text: '世界很温柔……', context: '离开后', chapter: '龙族III', importance: 10 },
    { charId: 'hly', text: 'Sakura……不要走……', context: '告别', chapter: '龙族III', importance: 10 },
    { charId: 'hly', text: '我……很开心……', context: '和Sakura在一起', chapter: '龙族III', importance: 9 },
    { charId: 'hly', text: '哥哥……', context: '称呼路明非', chapter: '龙族III', importance: 8 },
    { charId: 'hly', text: '外面的世界……好漂亮……', context: '第一次出门', chapter: '龙族III', importance: 9 },
    { charId: 'hly', text: '谢谢……愿意陪着我……', context: '对Sakura', chapter: '龙族III', importance: 9 },
    { charId: 'hly', text: '不想……回去……', context: '不愿回实验室', chapter: '龙族III', importance: 8 },

    // 楚子航 czh
    { charId: 'czh', text: '我不太会说话。但如果有什么事，我会来。', context: '承诺', chapter: '龙族II', importance: 9 },
    { charId: 'czh', text: '你还是不够了解我。我只说一遍，我从不说谎。', context: '对路明非', chapter: '龙族II', importance: 8 },
    { charId: 'czh', text: '我答应过一个人，要保护他想保护的一切。', context: '父亲', chapter: '龙族IV', importance: 10 },
    { charId: 'czh', text: '如果连重要的人都保护不了，力量还有什么意义。', context: '信念', chapter: '龙族II', importance: 9 },
    { charId: 'czh', text: '高架桥那天晚上，我明白了一件事。', context: '父亲之死', chapter: '龙族I', importance: 9 },
    { charId: 'czh', text: '我不是在跟你商量。', context: '强势', chapter: '龙族II', importance: 8 },
    { charId: 'czh', text: '走了。', context: '日常', chapter: '龙族I', importance: 6 },
    { charId: 'czh', text: '好。', context: '日常', chapter: '龙族I', importance: 6 },

    // 芬格尔 fge
    { charId: 'fge', text: '师弟啊，做人要厚道，做废柴要更厚道。', context: '教诲', chapter: '龙族I', importance: 9 },
    { charId: 'fge', text: '你废柴师兄我当年可是新闻部部长，什么人没见过。', context: '炫耀', chapter: '龙族II', importance: 8 },
    { charId: 'fge', text: '不要被外表迷惑，包括我的。也包括你自己的。', context: '深意', chapter: '龙族III', importance: 9 },
    { charId: 'fge', text: '我没胃口不是因为吃不下，是因为今天已经吃了五人份了。', context: '日常', chapter: '龙族I', importance: 7 },
    { charId: 'fge', text: '有时候英雄也会饿的。', context: '日常', chapter: '龙族II', importance: 7 },
    { charId: 'fge', text: '你这孩子就是太认真了。', context: '对路明非', chapter: '龙族III', importance: 7 },

    // 江南 jn
    { charId: 'jn', text: '写龙族的时候，我是真的在痛的。', context: '创作谈', chapter: '访谈', importance: 9 },
    { charId: 'jn', text: '路明非身上有我的影子，那个觉得自己是废柴又想做英雄的影子。', context: '创作谈', chapter: '访谈', importance: 9 },
    { charId: 'jn', text: '悲剧的力量比喜剧大得多。', context: '文学观', chapter: '访谈', importance: 8 },
    { charId: 'jn', text: '我觉得作家要写真正痛过的东西。', context: '创作观', chapter: '访谈', importance: 8 },
    { charId: 'jn', text: '读者问我为什么虐，我说因为生活本来就虐。', context: '回应读者', chapter: '访谈', importance: 7 }
  ];

  for (const q of quotes) {
    memory.addQuote(q.charId, q.text, q.context, q.chapter, q.importance);
  }
  console.log(`Seeded ${quotes.length} dialogue quotes`);
}

module.exports = { seedQuotes };
