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

function seedLore() {
  const count = storage.get('SELECT COUNT(*) as cnt FROM lore');
  if (count && count.cnt > 0) {
    console.log(`Seed skipped: ${count.cnt} lore entries already exist`);
    return;
  }

  const lore = [
    { topic: '混血种', content: '龙族与人类的混血后代，拥有龙族血统和言灵能力。分为S/A/B/C/D/E/F级。S级最为罕见和强大。卡塞尔学院专门培养混血种对抗龙王。', category: '世界观', importance: 8 },
    { topic: '龙王', content: '龙族中的至高存在，分为四大君主(青铜与火、大地与山、海洋与水、天空与风)和双生龙王(黑王与白王)。龙王死后会以卵的形式复活。', category: '世界观', importance: 8 },
    { topic: '言灵', content: '混血种通过龙血激活的超自然能力。每个言灵有独特效果，如君焰(火焰)、镰鼬(风刃)、时间零(时间减速)。言灵序列号越高越强。', category: '世界观', importance: 8 },
    { topic: '卡塞尔学院', content: '位于美国芝加哥的混血种精英学院，表面是普通大学，实际培养屠龙者。下设执行部、狮心会、学生会、新闻部等。', category: '世界观', importance: 7 },
    { topic: '尼伯龙根', content: '龙族创造的异空间，与现实世界平行。龙类可以在尼伯龙根中自由活动，人类进入后容易迷失。', category: '世界观', importance: 7 },
    { topic: '白王', content: '四大君主之外的最强龙王，掌握精神力量。绘梨衣是白王的容器。白王与黑王是双生关系。', category: '世界观', importance: 9 },
    { topic: '格陵兰事件', content: '芬格尔的前女友在格陵兰冰海执行任务时牺牲。芬格尔是唯一的幸存者。此后他以F级废柴身份潜伏，实际在暗中调查真相。', category: '事件', importance: 9 },
    { topic: '高架桥之战', content: '楚子航15岁时，父亲楚天骄在高架桥上独自面对奥丁并牺牲。楚子航成为这一战的唯一目击者，从此走上守护者之路。', category: '事件', importance: 10 },
    { topic: '夏弥真相', content: '楚子航在北京地铁中发现夏弥是龙王耶梦加得。两人一战，楚子航亲手杀死了她。这件事成为他心中最深的愧疚。', category: '事件', importance: 10 },
    { topic: '路鸣泽(小魔鬼)', content: '路明非体内的另一个存在，自称路鸣泽。每次交易会取走路明非一部分生命，但给予他屠龙的力量。真实身份可能是黑王或黑王之卵。', category: '角色', importance: 8 },
    { topic: '赫尔佐格', content: '表面上是一位德国医生，实际是策划了日本事件的黑手。他利用绘梨衣作为白王容器，最终被路明非杀死。极度狡猾和残忍。', category: '角色', importance: 8 },
    { topic: '凯撒·加图索', content: '卡塞尔学院学生会会长，意大利加图索家族的继承人。性格骄傲但重视同伴。与楚子航是亦敌亦友的关系。', category: '角色', importance: 7 },
    { topic: '诺诺(陈墨瞳)', content: '路明非的青梅竹马与初恋，是路明非进入卡塞尔的引路人。性格活泼开朗，对路明非有特殊意义。', category: '角色', importance: 7 },
    { topic: '日本分部', content: '卡塞尔学院在日本的分支机构，表面是蛇岐八家控制的组织。路明非在这里遇见了绘梨衣。这里的混血种有独特的武士道文化。', category: '地点', importance: 7 },
    { topic: '芝加哥卡塞尔本部', content: '学院本部位于芝加哥郊外，建筑风格古典。拥有图书馆、训练场、英灵殿等设施。', category: '地点', importance: 7 },
    { topic: '北京尼伯龙根', content: '位于北京地铁系统下方的一个大型尼伯龙根，是耶梦加得的领地。楚子航和路明非在这里经历了与夏弥的决战。', category: '地点', importance: 8 }
  ];

  for (const l of lore) {
    memory.addLore(l.topic, l.content, l.category, l.importance);
  }
  console.log(`Seeded ${lore.length} lore entries`);
}

module.exports = { seedQuotes, seedEvents, seedLore };
