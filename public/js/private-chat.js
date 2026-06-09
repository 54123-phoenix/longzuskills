const PrivateChat = {
  current: null, chats: {}, streaming: false,

  init() {
    const s = localStorage.getItem('pc');
    if (s) try { this.chats = JSON.parse(s); } catch {}
    Object.keys(CHARACTERS).forEach(id => { if (!this.chats[id]) this.chats[id] = { msgs: [], n: 0 }; });
    this.sidebar();
  },

  save() { localStorage.setItem('pc', JSON.stringify(this.chats)); },

  sidebar() {
    const c = document.getElementById('private-chat-list');
    if (!c) return;
    c.innerHTML = `<div class="sidebar-section-title">💬 私聊</div>
      ${Object.values(CHARACTERS).map(ch => {
        const conv = this.chats[ch.id]||{msgs:[],n:0};
        const last = conv.msgs.length>0 ? conv.msgs[conv.msgs.length-1] : null;
        return `<div class="private-chat-item ${this.current===ch.id?'active':''}" data-c="${ch.id}">
          <div class="private-chat-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="private-chat-info">
            <div class="private-chat-name">${ch.name}</div>
            <div class="private-chat-preview">${last ? (last.s?'你说: ':'')+this.e(this.t(last.t,20)) : '开始聊天'}</div>
          </div>
          <div class="private-chat-meta"><div class="private-chat-count">♥ ${conv.n}</div></div>
        </div>`;
      }).join('')}
    `;
    c.querySelectorAll('.private-chat-item').forEach(el => el.onclick = () => this.open(el.dataset.c));
  },

  open(id) {
    this.current = id;
    const ch = CHARACTERS[id];
    if (!ch) return;
    const conv = this.chats[id];
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="private-chat-container">
      <div class="private-chat-header">
        <div class="private-chat-header-left">
          <div class="private-chat-header-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div><div class="private-chat-header-name">${ch.name}</div>
          <div class="private-chat-header-desc">${ch.description}</div></div>
        </div>
        <button class="btn btn-secondary btn-sm" id="nc">🔄 新对话</button>
      </div>
      <div class="private-chat-messages" id="pm">
        ${conv.msgs.length===0 ? `<div class="private-chat-welcome">
          <div class="welcome-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="welcome-text">和 ${ch.name} 对话</div>
        </div>` : ''}
      </div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <input class="chat-input" id="pi" placeholder="给 ${ch.name} 发送消息..." maxlength="500" ${this.streaming?'disabled':''}>
        <button class="chat-send-btn" id="ps" ${this.streaming?'disabled':''}>发送</button></div></div>
    </div>`;
    if (conv.msgs.length > 0) this.renderMsgs(id);
    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i && s) {
      const send = () => {
        const t = i.value.trim();
        if (!t || this.streaming) return;
        this.addMsg(id, t, true);
        i.value = '';
        this.fetchReply(id);
      };
      s.onclick = send;
      i.onkeydown = e => { if (e.key === 'Enter') send(); };
    }
    document.getElementById('nc')?.addEventListener('click', () => { this.chats[id] = { msgs: [], n: 0 }; this.save(); this.open(id); });
    this.sidebar();
  },

  renderMsgs(id) {
    const c = document.getElementById('pm');
    if (!c) return;
    const ch = CHARACTERS[id], conv = this.chats[id];
    c.innerHTML = conv.msgs.map(m => {
      if (m.s) {
        const p = UserProfile.get();
        return `<div class="private-msg private-msg-self"><div class="private-msg-bubble private-bubble-self" style="background:${p.color}22">${this.e(m.t)}</div></div>`;
      } else {
        return `<div class="private-msg private-msg-other">
          <div class="private-msg-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="private-msg-content">
            <div class="private-msg-name">${ch.name}</div>
            <div class="private-msg-bubble private-bubble-other">${this.e(m.t)}</div>
          </div>
        </div>`;
      }
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  addMsg(id, text, isSelf) {
    const conv = this.chats[id];
    conv.msgs.push({ t: text, s: isSelf, ts: Date.now() });
    conv.n = conv.msgs.filter(m => !m.s).length;
    this.save();
    this.renderMsgs(id);
    this.sidebar();
  },

  async fetchReply(id) {
    this.streaming = true;
    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i) i.disabled = true; if (s) s.disabled = true;
    const conv = this.chats[id];
    const p = UserProfile.get();
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ charId:id, message:conv.msgs[conv.msgs.length-1].t,
          history:conv.msgs.slice(-8,-1).map(m=>({isSelf:m.s,text:m.t})), userName:p.nickname })
      });
      const d = await r.json();
      if (d.reply) this.addMsg(id, d.reply, false);
    } catch(e) { this.addMsg(id, '……', false); }
    this.streaming = false;
    if (i) i.disabled = false; if (s) s.disabled = false; if (i) i.focus();
  },

  e(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },
  t(s, n) { if (!s) return ''; return s.length > n ? s.substring(0, n) + '...' : s; }
};
