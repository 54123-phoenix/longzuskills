# T-003/006/009/010 四合一合约

## T-003 关系库 (characters.js)
为每个角色的 relations 增加 emotion 字段，表现深层情感:

绘梨衣 hly:
  lmf: { type: '恋人/唯一信任者', emotion: '依恋', strength: 100 }

楚子航 czh:
  lmf: { type: '师兄弟/守护', emotion: '责任', strength: 85 }
  fge: { type: '容忍', emotion: '无所谓', strength: 15 }
  hly: { type: '尊重', emotion: '距离', strength: 10 }

路明非 lmf:
  hly: { type: '永恒亏欠/深爱', emotion: '愧疚+怀念', strength: 100 }
  czh: { type: '榜样/兄弟', emotion: '崇拜+依赖', strength: 90 }
  fge: { type: '损友/兄弟', emotion: '信任+吐槽', strength: 80 }

芬格尔 fge:
  lmf: { type: '师兄弟/保护者', emotion: '守护+掩饰', strength: 95 }
  hly: { type: '友善保护', emotion: '怜惜', strength: 40 }

江南 jn:
  lmf: { type: '自我投射', emotion: '怜爱+愧疚', strength: 90 }
  hly: { type: '最深愧疚', emotion: '创作上的残忍', strength: 85 }

## T-006 应对机制 (characters.js)
每个角色在 characters.js 中新增 coping 字段:

hly: `沉默、写字表达、靠近信任的人`
czh: `沉默、独自承担、转化为行动`
lmf: `自嘲、逃避、装傻，但关键时刻会爆发`
fge: `用搞笑掩盖、暗中布局、关键时刻不再伪装`
jn: `用文学比喻消化情绪、自嘲消解`

## T-010 时间线 (characters.js)
每个角色新增 era 字段，标注当前角色所处的时期:
hly: `龙族III途中`, czh: `龙族IV`, lmf: `龙族IV`, fge: `龙族IV`, jn: `完结后`

## T-009 龙族 Lore RAG (新表 + 种子)

### DB (storage.js)
```sql
CREATE TABLE IF NOT EXISTS lore (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT '常识',
  importance INTEGER DEFAULT 5
);
CREATE INDEX IF NOT EXISTS idx_lore ON lore(category);
```

### memory.js
```js
addLore(topic, content, category, importance)
getLoreByCategory(category, limit) → [{topic, content}]
getPromptLore(limit) → 随机3条高重要性条目
```

### 种子数据 (15条核心龙族百科)

category: 世界观
- 混血种 | 龙族与人类的混血后代，拥有龙族血统和言灵能力。分为S/A/B/C/D/E/F级。S级最为罕见和强大。卡塞尔学院专门培养混血种对抗龙王。
- 龙王 | 龙族中的至高存在，分为四大君主(青铜与火、大地与山、海洋与水、天空与风)和双生龙王(黑王与白王)。龙王死后会以卵的形式复活。
- 言灵 | 混血种通过龙血激活的超自然能力。每个言灵有独特效果，如君焰(火焰)、镰鼬(风刃)、时间零(时间减速)。言灵序列号越高越强。
- 卡塞尔学院 | 位于美国芝加哥的混血种精英学院，表面是普通大学，实际培养屠龙者。下设执行部、狮心会、学生会、新闻部等。
- 尼伯龙根 | 龙族创造的异空间，与现实世界平行。龙类可以在尼伯龙根中自由活动，人类进入后容易迷失。
- 白王 | 四大君主之外的最强龙王，掌握精神力量。绘梨衣是白王的容器。白王与黑王是双生关系。

category: 事件
- 格陵兰事件 | 芬格尔的前女友在格陵兰冰海执行任务时牺牲。芬格尔是唯一的幸存者。此后他以F级废柴身份潜伏，实际在暗中调查真相。
- 高架桥之战 | 楚子航15岁时，父亲楚天骄在高架桥上独自面对奥丁并牺牲。楚子航成为这一战的唯一目击者，从此走上守护者之路。
- 夏弥真相 | 楚子航在北京地铁中发现夏弥是龙王耶梦加得。两人一战，楚子航亲手杀死了她。这件事成为他心中最深的愧疚。

category: 角色
- 路鸣泽(小魔鬼) | 路明非体内的另一个存在，自称路鸣泽。每次交易会取走路明非一部分生命，但给予他屠龙的力量。真实身份可能是黑王或黑王之卵。
- 赫尔佐格 | 表面上是一位德国医生，实际是策划了日本事件的黑手。他利用绘梨衣作为白王容器，最终被路明非杀死。极度狡猾和残忍。
- 凯撒·加图索 | 卡塞尔学院学生会会长，意大利加图索家族的继承人。性格骄傲但重视同伴。与楚子航是亦敌亦友的关系。
- 诺诺(陈墨瞳) | 路明非的青梅竹马与初恋，是路明非进入卡塞尔的引路人。性格活泼开朗，对路明非有特殊意义。

category: 地点
- 日本分部 | 卡塞尔学院在日本的分支机构，表面是蛇岐八家控制的组织。路明非在这里遇见了绘梨衣。这里的混血种有独特的武士道文化。
- 芝加哥卡塞尔本部 | 学院本部位于芝加哥郊外，建筑风格古典。拥有图书馆、训练场、英灵殿等设施。学生们在这里接受屠龙训练。
- 北京尼伯龙根 | 位于北京地铁系统下方的一个大型尼伯龙根，是耶梦加得的领地。楚子航和路明非在这里经历了与夏弥的决战。

### prompts.js buildCharPrompt
在 eventSection 之后追加 loreSection:
```js
let loreSection = '';
const loreItems = memory.getPromptLore(2);
if (loreItems && loreItems.length > 0) {
  const lines = loreItems.map(l => `- ${l.topic}: ${l.content}`).join('\n');
  loreSection = `\n\n【世界观参考】当对话涉及以下龙族世界观时，请确保准确：\n${lines}`;
}
```

拼接: `${ch.system}${dna}${quoteSection}${eventSection}${loreSection}${stateSection}\n正在和...`

### seed.js 新增 seedLore()
幂等插入15条lore数据。

### server.js
seed调用追加 seed.seedLore()

## prompt拼接最终顺序
`${ch.system}${dna}${quoteSection}${eventSection}${loreSection}${stateSection}\n正在和"${userId}"聊天。已聊${p.count}轮。${dimSection}${relEventSection}${episSection}${beliefSection}${memSection}${relSection}`
