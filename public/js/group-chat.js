const GroupChat = {
  messages: [], socket: null, isLoading: false, typingChars: {},

  init(socket) {
    this.socket = socket;
    this.bindEvents();
    fetch('/api/group-history').then(r => r.json()).then(msgs => {
      this.messages = msgs.length > 0 ? msgs : [];
      if (this.messages.length === 0) this.addLocalSystem('🐉 欢迎来到龙族聊天群！');
      this.render();
    }).catch(() => {
      if (this.messages.length === 0) this.addLocalSystem('🐉 欢迎来到龙族聊天群！');
      this.render();
    });
  },

  addLocalSystem(t) { this.messages.push({ type: 'system', text: t, ts: Date.now() }); },

  render() {
    const c = document.getElementById('group-chat-area');
    if (!c) return;
    const charAvatars = { hly: '🌸', fge: '🍔', czh: '🗡️', lmf: '🐉', jn: '✍️' };
    const charNames = { hly: '绘梨衣', fge: '芬格尔', czh: '楚子航', lmf: '路明非', jn: '江南' };
    c.innerHTML = `<div class="chat-header">
      <div class="chat-header-title">🐉 龙族聊天群</div>
      <div class="chat-header-members" id="goc"></div>
    </div>
    <div class="chat-messages" id="gm"></div>
    <div id="gt-avatars" style="display:flex;gap:4px;padding:4px 24px;min-height:28px;align-items:center;flex-wrap:wrap"></div>
    <div class="chat-input-area"><div class="chat-input-wrapper">
      <input class="chat-input" id="gi" placeholder="输入消息..." maxlength="500">
      <button class="chat-send-btn" id="gs">发送</button>
    </div></div>`;
    this.renderMsgs();
    const i = document.getElementById('gi'), s = document.getElementById('gs');
    if (i && s) { s.onclick = () => this.send(i); i.onkeydown = e => { if (e.key === 'Enter') this.send(i); }; }
  },

  renderMsgs() {
    const c = document.getElementById('gm'); if (!c) return;
    c.innerHTML = this.messages.map(m => {
      if (m.type === 'system') return `<div class="message-system">${this.e(m.text)}</div>`;
      return `<div class="message ${m.isSelf ? 'message-self' : 'message-other'}">
        ${!m.isSelf ? `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>` : ''}
        <div class="message-body">
          ${!m.isSelf ? `<div class="message-name">${this.e(m.name||'')}</div>` : ''}
          <div class="message-bubble ${m.isSelf?'bubble-self':'bubble-other'}">${this.e(m.text)}</div>
        </div>
        ${m.isSelf ? `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>` : ''}
      </div>`;
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  e(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },

  async send(input) {
    const text = input.value.trim();
    if (!text || this.isLoading) return;
    const p = UserProfile.get();
    const msg = { type: 'user', text, name: p.nickname, avatar: p.avatar, color: p.color, ts: Date.now(), isSelf: true };
    this.messages.push(msg); this.renderMsgs();
    input.value = '';
    this.isLoading = true;

    if (this.socket) this.socket.emit('gm', msg);

    const allChars = { hly: '🌸', fge: '🍔', czh: '🗡️', lmf: '🐉', jn: '✍️' };
    const allNames = { hly: '绘梨衣', fge: '芬格尔', czh: '楚子航', lmf: '路明非', jn: '江南' };
    const colors = { hly: '#e8739a', fge: '#f5a623', czh: '#4a90d9', lmf: '#7b68ee', jn: '#2c3e50' };

    this.showAllTyping(allChars, 5);
    this.typingChars = {};

    try {
      const r = await fetch('/api/group-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: this.messages.filter(m => m.type !== 'system').slice(-6).map(m => ({ charId: m.charId, text: m.text, name: m.name })), userName: p.nickname })
      });
      const d = await r.json();

      if (d.replies && d.replies.length > 0) {
        for (const reply of d.replies) {
          this.addCharTyping(reply.charId, allChars[reply.charId], colors[reply.charId]);
          await new Promise(r => setTimeout(r, 200));

          const m = { type: 'user', text: reply.text, name: reply.name, avatar: allChars[reply.charId], color: colors[reply.charId], ts: Date.now(), isSelf: false, charId: reply.charId };
          this.messages.push(m); this.renderMsgs();
          if (this.socket) this.socket.emit('gm', m);

          this.removeCharTyping(reply.charId);
          await new Promise(r => setTimeout(r, 400));
        }

        // Add remaining chars that didn't respond
        const responded = new Set(d.replies.map(r => r.charId));
        Object.keys(allChars).forEach(id => {
          if (!responded.has(id)) this.removeCharTyping(id);
        });
      } else {
        this.removeAllTyping();
      }
    } catch (e) {
      console.error('群聊失败:', e);
      this.removeAllTyping();
      this.addLocalSystem('⚠️ 角色们暂时无法回应，请稍后再试');
      this.renderMsgs();
    }
    this.isLoading = false;
  },

  showAllTyping(chars, count) {
    const c = document.getElementById('gt-avatars');
    if (!c) return;
    c.innerHTML = `<span style="font-size:12px;color:var(--text-light)">⏳ 角色们正在思考...</span>`;
  },

  addCharTyping(id, emoji, color) {
    this.typingChars[id] = { emoji, color };
    this.updateTyping();
  },

  removeCharTyping(id) {
    delete this.typingChars[id];
    this.updateTyping();
  },

  removeAllTyping() {
    this.typingChars = {};
    this.updateTyping();
  },

  updateTyping() {
    const c = document.getElementById('gt-avatars');
    if (!c) return;
    const entries = Object.entries(this.typingChars);
    if (entries.length === 0) { c.innerHTML = ''; return; }
    c.innerHTML = entries.map(([id, { emoji, color }]) =>
      `<div style="display:flex;align-items:center;gap:3px;padding:1px 8px;border-radius:10px;background:${color}18;font-size:11px">
        <span>${emoji}</span>
        <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
      </div>`
    ).join('');
  },

  bindEvents() {
    if (!this.socket) return;
    this.socket.on('gm', msg => { if (!msg.isSelf) { this.messages.push(msg); this.renderMsgs(); } });
    this.socket.on('on', d => { const e = document.getElementById('goc'); if (e) e.textContent = d.c + '人在线'; });
    this.socket.on('off', d => { const e = document.getElementById('goc'); if (e) e.textContent = d.c + '人在线'; });
  }
};
