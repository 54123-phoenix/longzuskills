const PrivateChat = {
  current: null, histories: {}, streaming: false, profiles: {},

  init() {
    this.loadProfiles();
    Object.keys(CHARACTERS).forEach(id => { this.histories[id] = []; });
    this.sidebar();
  },

  async loadProfiles() {
    try {
      const r = await fetch('/api/all-profiles');
      this.profiles = await r.json();
    } catch(e) {}
    // refresh sidebar to show intimacy
    this.sidebar();
  },

  async loadHistory(id) {
    try {
      const r = await fetch('/api/history/' + id);
      this.histories[id] = await r.json();
    } catch(e) { this.histories[id] = []; }
  },

  sidebar() {
    const c = document.getElementById('private-chat-list');
    if (!c) return;
    c.innerHTML = `<div class="sidebar-section-title">💬 私聊</div>
      ${Object.values(CHARACTERS).map(ch => {
        const prof = this.profiles[ch.id] || { count: 0, intimacy: 0, label: '陌生人' };
        const isActive = this.current === ch.id;
        return `<div class="private-chat-item ${isActive ? 'active' : ''}" data-c="${ch.id}">
          <div class="private-chat-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="private-chat-info">
            <div class="private-chat-name">
              ${ch.name}
              <span class="intimacy-badge" style="font-size:10px;color:${prof.intimacy>50?'#e8739a':prof.intimacy>10?'#f5a623':'#999'};margin-left:4px">${prof.label}</span>
            </div>
            <div class="private-chat-preview">${prof.count > 0 ? '已聊' + prof.count + '轮' : '开始聊天'}</div>
          </div>
          <div class="private-chat-meta">
            <div class="private-chat-count">♥ ${prof.intimacy}</div>
          </div>
        </div>`;
      }).join('')}
    `;
    c.querySelectorAll('.private-chat-item').forEach(el => el.onclick = () => this.open(el.dataset.c));
  },

  async open(id) {
    this.current = id;
    const ch = CHARACTERS[id];
    if (!ch) return;
    await this.loadHistory(id);
    this.currentHistory = this.histories[id] || [];
    const prof = this.profiles[id] || { count: 0, intimacy: 0, label: '陌生人' };
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="private-chat-container">
      <div class="private-chat-header">
        <div class="private-chat-header-left">
          <div class="private-chat-header-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div>
            <div class="private-chat-header-name">${ch.name}
              <span style="font-size:12px;color:#999;margin-left:6px">${prof.label} · ♥${prof.intimacy}</span>
            </div>
            <div class="private-chat-header-desc">${ch.description} · ${ch.tagline}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="nc">🔄 新对话</button>
      </div>
      <div class="private-chat-messages" id="pm">
        ${this.currentHistory.length === 0 ? `<div class="private-chat-welcome">
          <div class="welcome-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="welcome-text">和 ${ch.name} 对话</div>
          <div class="welcome-hint">你们现在是${prof.label}。开始聊天吧。</div>
          <div class="private-chat-stats" style="margin-top:12px;font-size:12px;color:#999">
            已聊${prof.count}轮 · 亲密度${prof.intimacy}/100
          </div>
        </div>` : ''}
      </div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <input class="chat-input" id="pi" placeholder="给 ${ch.name} 发送消息..." maxlength="500" ${this.streaming?'disabled':''}>
        <button class="chat-send-btn" id="ps" ${this.streaming?'disabled':''}>发送</button></div></div>
    </div>`;

    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i && s) {
      const send = () => {
        const t = i.value.trim();
        if (!t || this.streaming) return;
        this.currentHistory.push({ text: t, isSelf: true, timestamp: Date.now() });
        i.value = '';
        this.renderMsgs();
        this.fetchReply(id);
      };
      s.onclick = send;
      i.onkeydown = e => { if (e.key === 'Enter') send(); };
    }
    document.getElementById('nc')?.addEventListener('click', async () => {
      await fetch('/api/history/' + id, { method: 'DELETE' });
      this.histories[id] = [];
      this.currentHistory = [];
      await this.loadProfiles();
      this.open(id);
    });

    if (this.currentHistory.length > 0) this.renderMsgs();
    this.sidebar();
  },

  renderMsgs() {
    const c = document.getElementById('pm');
    if (!c) return;
    const ch = CHARACTERS[this.current];
    c.innerHTML = this.currentHistory.map(m => {
      if (m.isSelf) {
        const p = UserProfile.get();
        return `<div class="private-msg private-msg-self"><div class="private-msg-bubble private-bubble-self" style="background:${p.color}22">${this.e(m.text)}</div></div>`;
      } else {
        return `<div class="private-msg private-msg-other">
          <div class="private-msg-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="private-msg-content">
            <div class="private-msg-name">${ch.name}</div>
            <div class="private-msg-bubble private-bubble-other">${this.e(m.text)}</div>
          </div>
        </div>`;
      }
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  async fetchReply(id) {
    this.streaming = true;
    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i) i.disabled = true; if (s) s.disabled = true;
    const p = UserProfile.get();
    const lastMsg = this.currentHistory[this.currentHistory.length - 1];
    try {
      const r = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ charId:id, message:lastMsg.text, userName:p.nickname, conversationCount:this.currentHistory.length })
      });
      const d = await r.json();
      if (d.reply) {
        this.currentHistory.push({ text: d.reply, isSelf: false, timestamp: Date.now() });
        this.renderMsgs();
      }
      if (d.intimacy) {
        this.profiles[id] = d.intimacy;
        this.sidebar();
      }
    } catch(e) { this.currentHistory.push({ text: '……', isSelf: false, timestamp: Date.now() }); this.renderMsgs(); }
    this.streaming = false;
    if (i) i.disabled = false; if (s) s.disabled = false; if (i) i.focus();
  },

  e(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};
