(function() {
const PC = {
  current: null, histories: {}, streaming: false, profiles: {},
  model: localStorage.getItem('dm') || 'deepseek-chat',

  init() { this.loadProfiles(); Object.keys(window.CHARACTERS).forEach(id => { this.histories[id] = []; }); this.sidebar(); },

  async loadProfiles() {
    try { const r = await fetch('/api/all-profiles?userId=default'); this.profiles = await r.json(); } catch(e) {}
    this.sidebar();
  },

  async loadHistory(id, offset) {
    try {
      const r = await fetch(`/api/history/${id}?limit=30&offset=${offset||0}&userId=default`);
      const d = await r.json();
      if (offset) { this.histories[id] = [...d.msgs, ...this.histories[id]]; }
      else { this.histories[id] = d.msgs || []; }
    } catch(e) { if(!offset) this.histories[id]=[]; }
  },

  sidebar() {
    const c = document.getElementById('private-chat-list');
    if (!c) return;
    const chars = window.CHARACTERS;
    c.innerHTML = `<div class="sidebar-section-title">💬 私聊</div>
      ${Object.values(chars).map(ch => {
        const prof = this.profiles[ch.id] || { count:0, trust:0, respect:0, closeness:0, dependency:0, labels:['陌生人'] };
        const top = [prof.trust, prof.closeness, prof.respect, prof.dependency];
        const score = Math.floor(top.reduce((a,b)=>a+b,0)/4);
        return `<div class="private-chat-item ${this.current===ch.id?'active':''}" data-c="${ch.id}">
          <div class="private-chat-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${window.escHtml(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div class="private-chat-info">
            <div class="private-chat-name">${ch.name}
              <span style="font-size:10px;color:${score>50?'#e8739a':score>20?'#f5a623':'#999'};margin-left:4px">${prof.labels[0]||'...'}</span>
            </div>
            <div class="private-chat-preview">${prof.count>0?prof.count+'轮 · 均'+score:'点击开始'}</div>
          </div>
        </div>`;
      }).join('')}
    `;
    c.querySelectorAll('.private-chat-item').forEach(el => el.onclick = () => this.open(el.dataset.c));
  },

  async open(id) {
    this.current = id;
    const ch = window.CHARACTERS[id]; if (!ch) return;
    await this.loadHistory(id);
    this.ch = this.histories[id] || [];
    const prof = this.profiles[id] || { count:0, trust:0, respect:0, closeness:0, dependency:0, labels:['陌生人'] };
    const score = Math.floor((prof.trust+prof.respect+prof.closeness+prof.dependency)/4);
    const dims = [
      { k:'信任', v:prof.trust, h:'透露秘密' },
      { k:'尊重', v:prof.respect, h:'认可观点' },
      { k:'亲密', v:prof.closeness, h:'主动交谈' },
      { k:'依赖', v:prof.dependency, h:'寻求帮助' }
    ];
    const dimHTML = dims.map(d =>
      `<div style="margin:4px 0;display:flex;align-items:center;gap:8px;font-size:11px">
        <span style="width:32px;color:var(--text-light)">${d.k}</span>
        <div style="flex:1;height:3px;background:var(--border);border-radius:2px;overflow:hidden">
          <div style="width:${d.v}%;height:100%;background:var(--primary);transition:width 0.5s"></div>
        </div>
        <span style="width:28px;text-align:right;color:var(--text-dim)">${d.v}</span>
        <span style="font-size:10px;color:var(--text-light)">${d.v>=80?d.h:d.v>=30?'进行中':'未触发'}</span>
      </div>`
    ).join('');
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="private-chat-container">
      <div class="private-chat-header">
        <div class="private-chat-header-left">
          <div class="private-chat-header-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${window.escHtml(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div><div class="private-chat-header-name">${ch.name}
            <span class="role-badge ${id}">${['hly','fge','czh','lmf','jn'].indexOf(id)+1}/5</span>
            <span style="font-size:12px;color:#999;margin-left:6px">${prof.labels.join('·')||'陌生人'} · ${prof.count}轮</span></div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--text-light)">模型</span>
          <select id="ms" onchange="window.LZPrivate.model=this.value;localStorage.setItem('dm',this.value)">
            <option value="deepseek-chat" ${this.model==='deepseek-chat'?'selected':''}>💎 DeepSeek</option>
            <option value="deepseek-reasoner" ${this.model==='deepseek-reasoner'?'selected':''}>🧠 推理增强</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="nc">🔄新</button>
        </div>
      </div>
      <div style="padding:8px 24px;border-bottom:1px solid var(--border);background:var(--card-bg)">${dimHTML}</div>
      <div class="private-chat-messages" id="pm">
        ${this.ch.length===0 ? `<div class="private-chat-welcome">
          <div class="welcome-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${window.escHtml(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div class="welcome-text">和 ${ch.name} 对话</div>
          <div class="private-chat-stats">均分${score} · ${prof.labels.join(',')}</div>
          <div class="intimacy-bar"><div class="intimacy-fill" style="width:${score}%"></div></div></div>` : ''}
      </div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <input class="chat-input" id="pi" placeholder="给 ${ch.name} 发送..." maxlength="500" ${this.streaming?'disabled':''}>
        <button class="chat-send-btn" id="ps" ${this.streaming?'disabled':''}>发送</button></div></div></div>`;

    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i && s) { s.onclick = () => { const t=i.value.trim(); if(t) this.sendMsg(id,t,i); }; i.onkeydown = e => { if(e.key==='Enter'){ const t=i.value.trim(); if(t) this.sendMsg(id,t,i); } }; }
    document.getElementById('nc')?.addEventListener('click', async () => {
      await fetch(`/api/history/${id}?userId=default`,{method:'DELETE'}); this.histories[id]=[]; this.ch=[];
      await this.loadProfiles(); this.open(id);
    });
    if (this.ch.length > 0) this.render();
    this.sidebar();
  },

  sendMsg(id, text, input) { this.ch.push({ text, isSelf: true, timestamp: Date.now() }); input.value = ''; this.render(); this.fetchReply(id); },

  render() {
    const c = document.getElementById('pm'); if (!c) return;
    const ch = window.CHARACTERS[this.current];
    const e = window.escHtml, id = this.current;
    c.innerHTML = this.ch.map((m,i) => {
      if (m.isSelf) {
        return `<div class="private-msg private-msg-self" data-idx="${i}">
          <div class="msg-actions" style="justify-content:flex-end">
            <button class="msg-action-btn" onclick="window.LZPrivate.editMsg(${i})">✏️</button>
            <button class="msg-action-btn" onclick="window.LZPrivate.regenerate(${i})">🔄</button>
          </div>
          <div class="private-msg-bubble private-bubble-self">${e(m.text)}</div></div>`;
      } else {
        return `<div class="private-msg private-msg-other" data-char="${id}" data-idx="${i}">
          <div class="private-msg-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${e(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div class="private-msg-content">
            <div class="private-msg-name">${ch.name}</div>
            <div class="private-msg-bubble private-bubble-other">${e(m.text)}</div>
            <div class="msg-actions"><button class="msg-action-btn" onclick="window.LZPrivate.regenerate(${i})">🔄</button></div>
          </div></div>`;
      }
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  editMsg(idx) {
    const msg = this.ch[idx]; if (!msg || !msg.isSelf) return;
    const bubble = document.querySelector(`[data-idx="${idx}"] .private-bubble-self`);
    if (!bubble) return;
    const original = msg.text;
    bubble.contentEditable = 'true';
    bubble.focus();
    const sel = window.getSelection();
    if (sel) { const range = document.createRange(); range.selectNodeContents(bubble); sel.removeAllRanges(); sel.addRange(range); }
    const finish = () => {
      bubble.contentEditable = 'false';
      const newText = bubble.textContent.trim() || original;
      bubble.textContent = window.escHtml(newText);
      if (newText !== original) { msg.text = newText; this.ch = this.ch.slice(0, idx + 1); this.render(); this.fetchReply(this.current); }
    };
    bubble.onblur = finish;
    bubble.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(); } };
  },

  async regenerate(idx) {
    const msg = this.ch[idx]; if (!msg) return;
    const cutIdx = msg.isSelf ? idx + 1 : idx;
    this.ch = this.ch.slice(0, cutIdx); this.render();
    try {
      const r = await fetch('/api/regenerate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ charId:this.current, model:this.model, userId:'default' }) });
      const d = await r.json();
      if (d.reply) { this.ch.push({ text:d.reply, isSelf:false, timestamp:Date.now() }); this.render(); }
    } catch(e) {}
  },

  async fetchReply(id) {
    this.streaming = true;
    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if(i) { i.disabled=true; s.disabled=true; }
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ charId:id, message:this.ch[this.ch.length-1].text, userId:'default', model:this.model }) });
      const d = await r.json();
      if (d.reply) { this.ch.push({ text:d.reply, isSelf:false, timestamp:Date.now() }); this.render(); }
      if (d.profile) {
        const old = this.profiles[id] || {};
        const deltas = [];
        if (old.trust !== d.profile.trust && d.profile.trust > 0) deltas.push(`信任+${d.profile.trust - (old.trust||0)}`);
        if (old.respect !== d.profile.respect && d.profile.respect > 0) deltas.push(`尊重+${d.profile.respect - (old.respect||0)}`);
        if (old.closeness !== d.profile.closeness && d.profile.closeness > 0) deltas.push(`亲密+${d.profile.closeness - (old.closeness||0)}`);
        if (old.dependency !== d.profile.dependency && d.profile.dependency > 0) deltas.push(`依赖+${d.profile.dependency - (old.dependency||0)}`);
        if (deltas.length > 0) {
          const existing = document.querySelector('.growth-delta'); if (existing) existing.remove();
          const toast = document.createElement('div'); toast.className = 'growth-delta'; toast.innerHTML = deltas.join(' ');
          document.body.appendChild(toast); setTimeout(() => toast.remove(), 3500);
        }
        this.profiles[id] = d.profile; this.sidebar();
      }
    } catch(e) {}
    this.streaming = false;
    if(i) { i.disabled=false; s.disabled=false; i.focus(); }
  }
};
window.LZPrivate = PC;
window.PrivateChat = PC;
})();
