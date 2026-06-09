const PrivateChat = {
  currentCharId: null,
  conversations: {},
  isStreaming: false,

  init() {
    this.loadConversations();
    this.renderSidebar();
  },

  loadConversations() {
    const stored = localStorage.getItem('dragon_private_chats_v2');
    if (stored) {
      try { this.conversations = JSON.parse(stored); } catch { this.conversations = {}; }
    }
    Object.keys(CHARACTERS).forEach(id => {
      if (!this.conversations[id]) {
        this.conversations[id] = { messages: [], count: 0 };
      }
    });
  },

  saveConversations() {
    localStorage.setItem('dragon_private_chats_v2', JSON.stringify(this.conversations));
  },

  renderSidebar() {
    const container = document.getElementById('private-chat-list');
    if (!container) return;
    container.innerHTML = `
      <div class="sidebar-section-title">💬 私聊</div>
      ${Object.values(CHARACTERS).map(char => {
        const conv = this.conversations[char.id] || { messages: [], count: 0 };
        const lastMsg = conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
        const isActive = this.currentCharId === char.id;
        return `
          <div class="private-chat-item ${isActive ? 'active' : ''}" data-char="${char.id}">
            <div class="private-chat-avatar" style="background:${char.color}">${char.emoji}</div>
            <div class="private-chat-info">
              <div class="private-chat-name">${char.name}</div>
              <div class="private-chat-preview">${lastMsg ? (lastMsg.isSelf ? '你说: ' : '') + escapeHtml(truncate(lastMsg.text, 20)) : '开始聊天'}</div>
            </div>
            <div class="private-chat-meta">
              <div class="private-chat-count">♥ ${conv.count}</div>
            </div>
          </div>
        `;
      }).join('')}
    `;

    container.querySelectorAll('.private-chat-item').forEach(el => {
      el.addEventListener('click', () => {
        const charId = el.dataset.char;
        this.open(charId);
      });
    });
  },

  open(charId) {
    this.currentCharId = charId;
    const char = CHARACTERS[charId];
    if (!char) return;

    const main = document.getElementById('main-content');
    if (!main) return;

    const conv = this.conversations[charId];

    main.innerHTML = `
      <div class="private-chat-container">
        <div class="private-chat-header">
          <div class="private-chat-header-left">
            <div class="private-chat-header-avatar" style="background:${char.color}">${char.emoji}</div>
            <div>
              <div class="private-chat-header-name">${char.name}</div>
              <div class="private-chat-header-desc">${char.description}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="new-chat-btn">🔄 新对话</button>
        </div>
        <div class="private-chat-messages" id="private-messages">
          ${conv.messages.length === 0 ? `
            <div class="private-chat-welcome">
              <div class="welcome-avatar" style="background:${char.color}">${char.emoji}</div>
              <div class="welcome-text">开始和 ${char.name} 对话吧</div>
              <div class="welcome-hint">发送一条消息，${char.name} 会根据他的性格回复你</div>
            </div>
          ` : ''}
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <input type="text" class="chat-input" id="private-input" placeholder="给 ${char.name} 发送消息..." maxlength="500" ${this.isStreaming ? 'disabled' : ''}>
            <button class="chat-send-btn" id="private-send-btn" ${this.isStreaming ? 'disabled' : ''}>发送</button>
          </div>
        </div>
      </div>
    `;

    if (conv.messages.length > 0) {
      this.renderMessages(charId);
    }

    this.bindPrivateChatEvents(charId);
    this.updateSidebarActive(charId);
  },

  renderMessages(charId) {
    const container = document.getElementById('private-messages');
    if (!container) return;

    const char = CHARACTERS[charId];
    const conv = this.conversations[charId];
    if (!conv || !char) return;

    container.innerHTML = conv.messages.map(msg => {
      const time = formatTime(msg.timestamp);
      if (msg.isSelf) {
        const profile = UserProfile.get();
        return `
          <div class="private-msg private-msg-self">
            <div class="private-msg-bubble private-bubble-self" style="background:${profile.color}22">
              ${escapeHtml(msg.text)}
            </div>
            <div class="private-msg-time">${time}</div>
          </div>
        `;
      } else {
        return `
          <div class="private-msg private-msg-other">
            <div class="private-msg-avatar" style="background:${char.color}">${char.emoji}</div>
            <div class="private-msg-content">
              <div class="private-msg-name">${char.name}</div>
              <div class="private-msg-bubble private-bubble-other">
                ${escapeHtml(msg.text)}
              </div>
              <div class="private-msg-time">${time}</div>
            </div>
          </div>
        `;
      }
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  bindPrivateChatEvents(charId) {
    const input = document.getElementById('private-input');
    const sendBtn = document.getElementById('private-send-btn');
    if (!input || !sendBtn) return;

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text || this.isStreaming) return;
      this.addUserMessage(charId, text);
      input.value = '';
      input.focus();
      this.fetchAIReply(charId, text);
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('new-chat-btn')?.addEventListener('click', () => {
      this.startNewChat(charId);
    });
  },

  addUserMessage(charId, text) {
    const conv = this.conversations[charId];
    if (!conv) return;

    conv.messages.push({ text, isSelf: true, timestamp: Date.now() });
    conv.count = conv.messages.filter(m => !m.isSelf).length;
    this.saveConversations();
    this.renderMessages(charId);
    this.updateSidebar();
  },

  async fetchAIReply(charId, userMessage) {
    if (this.isStreaming) return;
    this.isStreaming = true;

    const input = document.getElementById('private-input');
    const sendBtn = document.getElementById('private-send-btn');
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    const char = CHARACTERS[charId];
    const conv = this.conversations[charId];
    const profile = UserProfile.get();

    this.showStreamingBubble(charId, '');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charId,
          message: userMessage,
          history: conv.messages.slice(-10, -1),
          userName: profile.nickname,
          conversationCount: conv.count
        })
      });
      const data = await res.json();
      if (data.reply) {
        this.streamText(charId, data.reply);
      } else {
        this.streamText(charId, '……');
      }
    } catch (err) {
      console.error('API error:', err);
      this.streamText(charId, '……网络不太好呢……');
    }
  },

  showStreamingBubble(charId, initialText) {
    const container = document.getElementById('private-messages');
    if (!container) return;

    const char = CHARACTERS[charId];
    const oldStreaming = container.querySelector('.streaming');
    if (oldStreaming) oldStreaming.remove();

    const div = document.createElement('div');
    div.className = 'private-msg private-msg-other streaming';
    div.id = 'streaming-msg';
    div.innerHTML = `
      <div class="private-msg-avatar" style="background:${char.color}">${char.emoji}</div>
      <div class="private-msg-content">
        <div class="private-msg-name">${char.name}</div>
        <div class="private-msg-bubble private-bubble-other streaming-bubble">
          <span class="streaming-text">${escapeHtml(initialText)}</span><span class="streaming-cursor">|</span>
        </div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  streamText(charId, fullText) {
    const container = document.getElementById('private-messages');
    const streamingEl = document.getElementById('streaming-msg');
    if (!streamingEl || !container) return;

    const textSpan = streamingEl.querySelector('.streaming-text');
    let index = 0;

    function typeChar() {
      if (index < fullText.length) {
        textSpan.textContent = fullText.substring(0, index + 1);
        index++;
        container.scrollTop = container.scrollHeight;
        setTimeout(typeChar, 20 + Math.random() * 30);
      } else {
        streamingEl.classList.remove('streaming');
        streamingEl.id = '';
        const cursor = streamingEl.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();

        const conv = this.conversations[charId];
        conv.messages.push({ text: fullText, isSelf: false, timestamp: Date.now() });
        conv.count = conv.messages.filter(m => !m.isSelf).length;
        this.saveConversations();

        this.isStreaming = false;
        const input = document.getElementById('private-input');
        const sendBtn = document.getElementById('private-send-btn');
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
        this.updateSidebar();
      }
    }

    typeChar.call(this);
  },

  startNewChat(charId) {
    this.conversations[charId] = { messages: [], count: 0 };
    this.saveConversations();
    this.open(charId);
  },

  updateSidebar() {
    this.renderSidebar();
  },

  updateSidebarActive(charId) {
    document.querySelectorAll('.private-chat-item').forEach(el => {
      el.classList.toggle('active', el.dataset.char === charId);
    });
  }
};

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}
