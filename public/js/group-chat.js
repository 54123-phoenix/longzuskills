const GroupChat = {
  messages: [], socket: null, isLoading: false,

  init(socket) {
    this.socket = socket;
    const stored = localStorage.getItem('gc');
    if (stored) try { this.messages = JSON.parse(stored); } catch {}
    if (this.messages.length === 0) {
      this.addSystem('🐉 欢迎加入龙族聊天群！');
    }
    this.bindEvents();
    this.render();
  },

  addSystem(t) { this.messages.push({ type: 'system', text: t, ts: Date.now() }); this.save(); },

  save() { localStorage.setItem('gc', JSON.stringify(this.messages)); },

  render() {
    const c = document.getElementById('group-chat-area');
    if (!c) return;
    c.innerHTML = `<div class="chat-header"><div class="chat-header-title">🐉 龙族聊天群</div><div class="chat-header-members" id="goc"></div></div>
      <div class="chat-messages" id="gm"></div>
      <div class="typing-indicator" id="gt"></div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <input class="chat-input" id="gi" placeholder="输入消息..." maxlength="500">
        <button class="chat-send-btn" id="gs">发送</button></div></div>`;
    this.renderMsgs();
    const i = document.getElementById('gi'), s = document.getElementById('gs');
    if (i && s) {
      s.onclick = () => this.send(i);
      i.onkeydown = e => { if (e.key === 'Enter') this.send(i); };
    }
  },

  renderMsgs() {
    const c = document.getElementById('gm');
    if (!c) return;
    c.innerHTML = this.messages.map(m => {
      if (m.type === 'system') return `<div class="message-system">${this.e(m.text)}</div>`;
      return `<div class="message ${m.isSelf ? 'message-self' : 'message-other'}">
        ${!m.isSelf ? `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>` : ''}
        <div class="message-body">
          ${!m.isSelf ? `<div class="message-name">${this.e(m.name||'')}</div>` : ''}
          <div class="message-bubble ${m.isSelf ? 'bubble-self' : 'bubble-other'}">${this.e(m.text)}</div>
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
    const msg = { type:'user', text, name:p.nickname, avatar:p.avatar, color:p.color, ts:Date.now(), isSelf:true };
    this.messages.push(msg); this.save(); this.renderMsgs();
    input.value = '';
    this.isLoading = true;
    if (this.socket) this.socket.emit('group-message', msg);
    const el = document.getElementById('gt');
    if (el) el.textContent = '⏳ 角色们思考中...';
    try {
      const r = await fetch('/api/group-chat', { method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:text,
          history:this.messages.filter(m=>m.type!=='system').slice(-6).map(m=>({charId:m.charId,text:m.text,name:m.name})),
          userName:p.nickname})
      });
      const d = await r.json();
      if (el) el.textContent = '';
      if (d.replies) {
        for (const reply of d.replies) {
          const charMap = {hly:['🌸','#e8739a'],fge:['🍔','#f5a623'],czh:['🗡️','#4a90d9'],lmf:['🐉','#7b68ee'],jn:['✍️','#2c3e50']};
          const [emo, col] = charMap[reply.charId]||['👤','#999'];
          const m = { type:'user', text:reply.text, name:reply.name,
            avatar:emo, color:col, ts:Date.now(), isSelf:false, charId:reply.charId };
          this.messages.push(m); this.save(); this.renderMsgs();
          await new Promise(r => setTimeout(r, 600));
        }
      }
    } catch(e) { console.error(e); if(el) el.textContent=''; }
    this.isLoading = false;
  },

  bindEvents() {
    if (!this.socket) return;
    this.socket.on('group-message', msg => { if (!msg.isSelf) { this.messages.push(msg); this.save(); this.renderMsgs(); } });
    this.socket.on('user-online', d => { const e=document.getElementById('goc'); if(e) e.textContent=d.onlineCount+'人在线'; });
    this.socket.on('user-offline', d => { const e=document.getElementById('goc'); if(e) e.textContent=d.onlineCount+'人在线'; });
  }
};
