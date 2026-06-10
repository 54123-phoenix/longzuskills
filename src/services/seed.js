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

function seedEvents() {
  const count = storage.get('SELECT COUNT(*) as cnt FROM character_events');
  if (count && count.cnt > 0) {
    console.log(`Seed skipped: ${count.cnt} events already exist`);
    return;
  }

  const events = [
    { charId: 'czh', eventName: '高架桥之夜', description: '15岁雨夜，父亲为救他独自面对奥丁而死。从此背负"守护者"命运', impact: '形成守护者人格，无法接受再次失去', period: '龙族I', importance: 10 },
    { charId: 'czh', eventName: '夏弥之死', description: '发现夏弥是龙王耶梦加得，在一场战斗中亲手杀死她', impact: '无尽愧疚，从此眼神更冷', period: '龙族II', importance: 10 },
    { charId: 'czh', eventName: '进入卡塞尔', description: '被狮心会看中，后成为狮心会会长', impact: '找到归属', period: '龙族I', importance: 7 },
    { charId: 'czh', eventName: '与路明非初遇', description: '在卡塞尔遇见废柴师弟路明非', impact: '逐渐认可这个师弟', period: '龙族I', importance: 8 },
    { charId: 'czh', eventName: '守护路明非', description: '多次在战斗中保护路明非', impact: '把路明非当成需要保护的人', period: '龙族II/III', importance: 8 },
    { charId: 'czh', eventName: '父亲的真相', description: '逐渐了解父亲楚天骄的真实身份和使命', impact: '理解父亲的选择', period: '龙族IV', importance: 9 },
    { charId: 'czh', eventName: '奥丁再临', description: '再次面对奥丁，完成了父亲未竟的战斗', impact: '释然', period: '龙族IV', importance: 9 },
    { charId: 'czh', eventName: '寡言的习惯', description: '因为经历太多失去，变得沉默寡言', impact: '所有情感压缩在极短的句子里', period: '贯穿', importance: 8 },
    { charId: 'lmf', eventName: '被卡塞尔录取', description: '以为是野鸡大学，实际上是被选中的S级混血种', impact: '命运转折', period: '龙族I', importance: 7 },
    { charId: 'lmf', eventName: '第一次与路鸣泽交易', description: '用1/4生命换取力量，击败青铜与火之王', impact: '发现自己体内有怪物', period: '龙族I', importance: 9 },
    { charId: 'lmf', eventName: '遇见绘梨衣', description: '在日本遇到不能说话的女孩，带她看世界', impact: '第一次感到被人需要', period: '龙族III', importance: 9 },
    { charId: 'lmf', eventName: '绘梨衣之死', description: '绘梨衣在他面前被赫尔佐格杀死', impact: '此生最大的痛，提到绘梨衣会沉默', period: '龙族III', importance: 10 },
    { charId: 'lmf', eventName: '第二次交易', description: '用另一半生命换取力量为绘梨衣复仇', impact: '愤怒到愿意放弃一切', period: '龙族III', importance: 9 },
    { charId: 'lmf', eventName: '成为学生会长', description: '接替凯撒成为学生会会长', impact: '被认可但内心仍然觉得自己不配', period: '龙族IV', importance: 7 },
    { charId: 'lmf', eventName: '寄人篱下的童年', description: '从小寄住在叔叔家，被婶婶嫌弃', impact: '用自嘲和装傻保护自己', period: '龙族I', importance: 8 },
    { charId: 'hly', eventName: '被囚禁的童年', description: '从小被关在实验室，作为白王容器被研究', impact: '不能说话，只能用纸笔交流', period: '龙族III', importance: 10 },
    { charId: 'hly', eventName: '第一次出门', description: 'Sakura带她离开实验室，看到外面的世界', impact: '第一次感到自由和快乐', period: '龙族III', importance: 9 },
    { charId: 'hly', eventName: '和Sakura的日常', description: '和Sakura一起吃饭、逛街、看烟花', impact: '最幸福的时光', period: '龙族III', importance: 9 },
    { charId: 'hly', eventName: '赫尔佐格的背叛', description: '被信任的赫尔佐格背叛，作为容器被利用', impact: '绝望', period: '龙族III', importance: 10 },
    { charId: 'hly', eventName: '最后的告白', description: '在生命最后时刻，用尽力气对Sakura说话', impact: '把世界的温柔留给了Sakura', period: '龙族III', importance: 10 },
    { charId: 'fge', eventName: '格陵兰事件', description: '前女友在格陵兰任务中牺牲', impact: '从此隐藏真实实力，以F级废柴示人', period: '龙族前传', importance: 10 },
    { charId: 'fge', eventName: '潜伏卡塞尔', description: '以留级废柴身份潜伏，暗中保护路明非', impact: '被低估是最强武器', period: '龙族I/II/III', importance: 9 },
    { charId: 'fge', eventName: '情报之王', description: '掌握卡塞尔几乎所有秘密情报', impact: '信息即权力', period: '贯穿', importance: 8 },
    { charId: 'fge', eventName: '卸下伪装', description: '在关键时刻展露真实实力', impact: '被路明非看穿后不再隐瞒', period: '龙族III', importance: 8 },
    { charId: 'jn', eventName: '化学系写小说', description: '在北大化学系实验室开始写龙族', impact: '科学思维融入文学创作', period: '-', importance: 7 },
    { charId: 'jn', eventName: '龙族完结', description: '龙族系列完结引发读者巨大争议', impact: '被骂但也被爱', period: '-', importance: 8 },
    { charId: 'jn', eventName: '公开回应读者', description: '多次在微博和访谈中回应读者对结局的质疑', impact: '坚持悲剧美学', period: '-', importance: 7 }
  ];

  for (const e of events) {
    memory.addCharEvent(e.charId, e.eventName, e.description, e.impact, e.period, e.importance);
  }
  console.log(`Seeded ${events.length} character events`);
}

module.exports = { seedQuotes, seedEvents };
