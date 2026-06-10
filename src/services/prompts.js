const characters = require('./characters');
const memory = require('./memory');
const ai = require('./ai');

const THOUGHT_INSTRUCTION = '\n\n【内心机制】回复前先在心里快速想一句（用<>包裹），然后正常回话。内心想法只反映你的真实感受，不要直接说出来。示例：<他好像需要帮助> 你怎么了。';

function buildCharPrompt(charId, userId, memories) {
  const ch = characters.getChar(charId);
  if (!ch) return '';
  const p = memory.getOrCreateProfile(charId, userId);
  const labels = memory.dimLabels(p);

  let dimSection = '';
  if (p.count > 0) {
    dimSection = `\n\n【关系维度】\n信任:${'█'.repeat(Math.floor(p.trust/5))} (${p.trust}%) - ${p.trust >= 80 ? '会透露秘密' : p.trust >= 30 ? '开始坦诚' : '保持戒备'}\n尊重:${'█'.repeat(Math.floor(p.respect/5))} (${p.respect}%) - ${p.respect >= 80 ? '认可你的判断' : p.respect >= 30 ? '会考虑你的意见' : '不屑一顾'}\n亲密:${'█'.repeat(Math.floor(p.closeness/5))} (${p.closeness}%) - ${p.closeness >= 80 ? '主动找你说话' : p.closeness >= 30 ? '不排斥你' : '保持距离'}\n依赖:${'█'.repeat(Math.floor(p.dependency/5))} (${p.dependency}%) - ${p.dependency >= 80 ? '有困难会找你' : p.dependency >= 30 ? '偶尔求助' : '独自承担'}`;
  }

  let relEventSection = '';
  const dimNameMap = { trust: '信任', respect: '尊重', closeness: '亲密', dependency: '依赖' };
  const relEvents = memory.getRelationEvents(charId, userId, 5);
  if (relEvents && relEvents.length > 0) {
    const lines = relEvents.map(e =>
      `- ${dimNameMap[e.dimension] || e.dimension}${e.change > 0 ? '+' : ''}${e.change}: ${e.reason}`
    ).join('\n');
    relEventSection = `\n\n【最近关系变化】\n${lines}`;
  }

  let episSection = '';
  const recentEps = memory.getRecentEpisodes(charId, userId, 7);
  if (recentEps && recentEps.length > 0) {
    const lines = recentEps.map(e =>
      `- ${memory.timeLabel(e.created_at)} ${e.event}（情绪：${e.emotion || ''}）`
    ).join('\n');
    episSection = `\n\n【最近7天的经历】\n${lines}`;
  } else {
    const allEps = memory.getEpisodes(charId, userId, 5);
    if (allEps && allEps.length > 0) {
      const lines = allEps.map(e =>
        `- ${memory.timeLabel(e.created_at)} ${e.event}（情绪：${e.emotion || ''}）`
      ).join('\n');
      episSection = `\n\n【之前的经历】\n${lines}`;
    }
  }

  let beliefSection = '';
  const beliefs = memory.getBeliefs(charId, userId, 8);
  if (beliefs && beliefs.length > 0) {
    const catMap = { '价值观': '💡', '自我认知': '🪞', '世界观': '🌍', '偏好': '❤️', '恐惧': '😨' };
    const lines = beliefs.map(b => `- ${catMap[b.category]||''} ${b.belief} (确信:${Math.floor(b.confidence*100)}%)`).join('\n');
    beliefSection = `\n\n【对${userId}的理解】\n${lines}`;
  }

  let memSection = '';
  if (memories && memories.length > 0) {
    const memLines = memories.filter(m => m.confidence > 0.3).slice(0, 10).map(m => `- ${m.key}: ${m.value} (确信度:${Math.floor(m.confidence*100)}%)`).join('\n');
    if (memLines) memSection = `\n\n【关于${userId}的长期记忆】\n${memLines}`;
  }

  const relations = memory.getRelations(charId);
  let relSection = '';
  if (relations && relations.length > 0) {
    const relLines = relations.map(r => {
      const other = r.char_id_a === charId ? r.char_id_b : r.char_id_a;
      const otherCh = characters.getChar(other);
      return `- 与${otherCh?.name || other}: ${r.relation} (强度:${Math.floor(r.strength*100)}%)`;
    }).join('\n');
    if (relLines) relSection = `\n\n【与其他角色的关系】\n${relLines}`;
  }

  let loreSection = '';
  const loreItems = memory.getPromptLore(2);
  if (loreItems && loreItems.length > 0) {
    const lines = loreItems.map(l => `- ${l.topic}: ${l.content}`).join('\n');
    loreSection = `\n\n【世界观参考】当对话涉及以下龙族世界观时，请确保描述准确：\n${lines}`;
  }

  let stateSection = '';
  const st = memory.getCharState(charId, userId);
  if (st) {
    const moodMap = { '开心': '😊', '平静': '😐', '低落': '😔', '好奇': '🤔', '担心': '😟' };
    const moodEmoji = moodMap[st.mood] || '';
    const hints = [];
    if (st.energy < 20) hints.push('精力很低，话会很少');
    if (st.stress > 70) hints.push('压力很大，可能语气变冷');
    if (st.favor > 70) hints.push('对对方很有好感，回应会更主动');
    const hintText = hints.length > 0 ? '\n' + hints.map(h => `（${h}）`).join(' ') : '';
    stateSection = `\n\n【你当前的状态】\n心情: ${moodEmoji}${st.mood} | 压力: ${'█'.repeat(Math.floor(st.stress/10))} | 精力: ${'█'.repeat(Math.floor(st.energy/10))} | 好感: ${st.favor}/100${hintText}\n你的回复需自然反映当前状态。`;
  }
  const lastThought = memory.getLastThought(charId, userId);
  if (lastThought) {
    stateSection += `\n刚才心里想: "${lastThought}"`;
  }

  let quoteSection = '';
  const quotes = memory.getPromptQuotes(charId);
  if (quotes && quotes.length > 0) {
    const lines = quotes.map(q =>
      `- "${q.text}"${q.context ? ' (' + q.context + ')' : ''}`
    ).join('\n');
    quoteSection = `\n\n【原著语气参考】以下是${ch.name}在原著中说过的类似的话，请严格模仿其语气和措辞：\n${lines}`;
  }

  let eventSection = '';
  const charEvents = memory.getPromptEvents(charId);
  if (charEvents && charEvents.length > 0) {
    const lines = charEvents.map(e =>
      `- 【${e.event_name}】${e.description}。影响: ${e.impact}`
    ).join('\n');
    eventSection = `\n\n【你的重要经历】当对话涉及相关话题时，可以自然地回忆这些经历：\n${lines}`;
  }

  const dna = characters.getCharDNA(charId);
  return `${ch.system}${dna}${THOUGHT_INSTRUCTION}${quoteSection}${eventSection}${loreSection}${stateSection}\n正在和"${userId}"聊天。已聊${p.count}轮。${dimSection}${relEventSection}${episSection}${beliefSection}${memSection}${relSection}`;
}

function buildGroupPrompt(charId, userId) {
  const ch = characters.getChar(charId);
  if (!ch) return '';
  const meta = characters.getAllMeta();
  const relLines = Object.entries(ch.relations || {})
    .map(([id, r]) => { const other = meta[id]; return other ? `- ${other.n}：${r.type}（亲密度${r.strength}）` : ''; })
    .filter(Boolean).join('\n');
  const relSection = relLines ? `\n\n【群内关系】你知道群里有这些人，可以和他们互动：\n${relLines}\n可以@他们、接过他们的话、或对他们的发言流露态度。` : '';
  return `${ch.system}${relSection}\n${characters.GROUP_PROMPT}\n正在和"${userId}"等群聊。`;
}

async function extractAndSaveMemories(charId, userId, recentMessages) {
  try {
    const memories = await ai.extractMemories(recentMessages);
    for (const mem of memories) {
      if (mem.key && mem.value && mem.confidence > 0.3) {
        memory.setMemory(charId, userId, mem.key, mem.value, mem.confidence);
        // Also set relationship strength for character-charId pairs
        if (charId !== userId) {
          const rel = memory.getRelations(charId).find(r => r.char_id_b === userId || r.char_id_a === userId);
          if (rel) {
            memory.setRelation(charId, userId, rel.relation || '聊天伙伴', Math.min(1, rel.strength + 0.01));
          } else {
            memory.setRelation(charId, userId, '聊天伙伴', 0.1);
          }
        }
      }
    }
  } catch (e) { /* memory extraction is best-effort */ }
}

async function extractAndSaveEpisodes(charId, userId, recentMessages) {
  try {
    const episodes = await ai.extractEpisodes(recentMessages);
    for (const ep of episodes) {
      if (ep.event && ep.importance > 0.3) {
        memory.setEpisode(charId, userId, {
          event: ep.event,
          reason: ep.reason || '',
          emotion: ep.emotion || '',
          importance: ep.importance || 0.5
        });
      }
    }
  } catch (e) { /* episode extraction is best-effort */ }
}

async function extractAndSaveBeliefs(charId, userId, recentMessages) {
  try {
    const beliefs = await ai.extractBeliefs(recentMessages);
    for (const b of beliefs) {
      if (b.belief && b.confidence > 0.3) {
        memory.setBelief(charId, userId, b.belief, b.category || '价值观', b.confidence);
      }
    }
  } catch (e) { /* best-effort */ }
}

module.exports = { buildCharPrompt, buildGroupPrompt, extractAndSaveMemories, extractAndSaveEpisodes, extractAndSaveBeliefs };
