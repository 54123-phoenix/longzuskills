const PrivateChat = {
  current: null, histories: {}, streaming: false, profiles: {},
  model: localStorage.getItem('dm') || 'qwen-plus',

  init() {
    this.loadProfiles();
    Object.keys(CHARACTERS).forEach(id => { this.histories[id] = []; });
    this.sidebar();
  },

  async loadProfiles() {
    try { const r = await fetch('/api/all-profiles'); this.profiles = await r.json(); } catch(e) {}
    this.sidebar();
  },

  async loadHistory(id, offset) {
    try {
      const r = await fetch(`/api/history/${id}?limit=30&offset=${offset||0}`);
      const d = await r.json();
      if (offset) {
        this.histories[id] = [...d.msgs, ...this.histories[id]];
      } else {
        this.histories[id] = d.msgs || [];
      }
    } catch(e) { if(!offset) this.histories[id]=[]; }
  },

  sidebar() {
    const c = document.getElementById('private-chat-list');
    if (!c) return;
    c.innerHTML = `<div class="sidebar-section-title">💬 私聊</div>
      ${Object.values(CHARACTERS).map(ch => {
        const prof = this.profiles[ch.id] || { count: 0, intimacy: 0, label: '陌生人' };
        return `<div class="private-chat-item ${this.current===ch.id?'active':''}" data-c="${ch.id}">
          <div class="private-chat-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="private-chat-info">
            <div class="private-chat-name">${ch.name}
              <span style="font-size:10px;color:${prof.intimacy>50?'#e8739a':prof.intimacy>10?'#f5a623':'#999'};margin-left:4px">${prof.label}</span>
            </div>
            <div class="private-chat-preview">${prof.count>0?prof.count+'轮  ♥'+prof.intimacy:'点击开始'}</div>
          </div>
        </div>`;
      }).join('')}
    `;
    c.querySelectorAll('.private-chat-item').forEach(el => el.onclick = () => this.open(el.dataset.c));
  },

  async open(id) {
    this.current = id;
    const ch = CHARACTERS[id]; if (!ch) return;
    await this.loadHistory(id);
    this.ch = this.histories[id] || [];
    const prof = this.profiles[id] || { count:0, intimacy:0, label:'陌生人' };
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="private-chat-container">
      <div class="private-chat-header">
        <div class="private-chat-header-left">
          <div class="private-chat-header-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div>
            <div class="private-chat-header-name">${ch.name}
              <span style="font-size:12px;color:#999;margin-left:6px">${prof.label}·♥${prof.intimacy}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--text-light)">模型</span>
          <select id="ms" onchange="PrivateChat.model=this.value;localStorage.setItem('dm',this.value)">
            <option value="qwen-turbo" ${this.model==='qwen-turbo'?'selected':''}>⚡ 极速</option>
            <option value="qwen-plus" ${this.model==='qwen-plus'?'selected':''}>🚀 平衡</option>
            <option value="qwen-max" ${this.model==='qwen-max'?'selected':''}>💎 最强</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="nc">🔄 新</button>
        </div>
      </div>
      <div class="private-chat-messages" id="pm">
        ${this.ch.length===0 ? `<div class="private-chat-welcome">
          <div class="welcome-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="welcome-text">和 ${ch.name} 对话</div>
          <div class="private-chat-stats">${prof.label} · 已聊${prof.count}轮</div>
          <div class="intimacy-bar"><div class="intimacy-fill" style="width:${prof.intimacy}%"></div></div>
        </div>` : ''}
      </div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <input class="chat-input" id="pi" placeholder="给 ${ch.name} 发送..." maxlength="500" ${this.streaming?'disabled':''}>
        <button class="chat-send-btn" id="ps" ${this.streaming?'disabled':''}>发送</button>
      </div></div>
    </div>`;

    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i && s) {
      s.onclick = () => { const t=i.value.trim(); if(t) this.sendMsg(id,t,i); };
      i.onkeydown = e => { if(e.key==='Enter'){ const t=i.value.trim(); if(t) this.sendMsg(id,t,i); } };
    }
    document.getElementById('nc')?.addEventListener('click', async () => {
      await fetch(`/api/history/${id}`,{method:'DELETE'}); this.histories[id]=[]; this.ch=[];
      await this.loadProfiles(); this.open(id);
    });
    if (this.ch.length > 0) this.render();
    this.sidebar();
  },

  sendMsg(id, text, input) {
    this.ch.push({ text, isSelf: true, timestamp: Date.now() });
    input.value = ''; this.render(); this.fetchReply(id);
  },

  render() {
    const c = document.getElementById('pm'); if (!c) return;
    const ch = CHARACTERS[this.current];
    c.innerHTML = this.ch.map((m,i) => {
      if (m.isSelf) {
        return `<div class="private-msg private-msg-self" data-idx="${i}">
          <div class="msg-actions" style="justify-content:flex-end">
            <button class="msg-action-btn" onclick="PrivateChat.editMsg(${i})" title="编辑">✏️</button>
            <button class="msg-action-btn" onclick="PrivateChat.regenerate(${i})" title="重发">🔄</button>
          </div>
          <div class="private-msg-bubble private-bubble-self">${this.e(m.text)}</div>
        </div>`;
      } else {
        return `<div class="private-msg private-msg-other" data-idx="${i}">
          <div class="private-msg-avatar" style="background:${ch.color}">${ch.emoji}</div>
          <div class="private-msg-content">
            <div class="private-msg-name">${ch.name}</div>
            <div class="private-msg-bubble private-bubble-other">${this.e(m.text)}</div>
            <div class="msg-actions">
              <button class="msg-action-btn" onclick="PrivateChat.regenerate(${i})" title="重新生成">🔄</button>
            </div>
          </div>
        </div>`;
      }
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  editMsg(idx) {
    const msg = this.ch[idx];
    if (!msg || !msg.isSelf) return;
    const newText = prompt('编辑消息:', msg.text);
    if (newText && newText.trim()) {
      msg.text = newText.trim();
      // Remove subsequent messages and regenerate
      this.ch = this.ch.slice(0, idx + 1);
      this.render();
      this.fetchReply(this.current);
    }
  },

  async regenerate(idx) {
    const msg = this.ch[idx];
    if (!msg) return;
    // Remove the targeted AI message and subsequent messages
    const cutIdx = msg.isSelf ? idx : idx;
    this.ch = this.ch.slice(0, cutIdx + (msg.isSelf ? 0 : 0));
    this.render();
    try {
      const r = await fetch('/api/regenerate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ charId:this.current, model:this.model, userName:'default' })
      });
      const d = await r.json();
      if (d.reply) { this.ch.push({ text:d.reply, isSelf:false, timestamp:Date.now() }); this.render(); }
    } catch(e) {}
  },

  async fetchReply(id) {
    this.streaming = true;
    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if(i) i.disabled=true; if(s) s.disabled=true;
    try {
      const r = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ charId:id, message:this.ch[this.ch.length-1].text, userName:'default', model:this.model, conversationCount:this.ch.length })
      });
      const d = await r.json();
      if (d.reply) { this.ch.push({ text:d.reply, isSelf:false, timestamp:Date.now() }); this.render(); }
      if (d.intimacy) { this.profiles[id]=d.intimacy; this.sidebar(); }
    } catch(e) {}
    this.streaming = false;
    if(i) i.disabled=false; if(s) s.disabled=false; if(i) i.focus();
  },

  e(s) { if(!s) return ''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
};
