const UserProfile = {
  _data: null,

  getDefaultProfile() {
    return {
      nickname: '龙族新兵',
      avatar: '🐉',
      color: '#7b68ee'
    };
  },

  load() {
    const stored = localStorage.getItem('dragon_user_profile');
    if (stored) {
      try {
        this._data = JSON.parse(stored);
      } catch {
        this._data = this.getDefaultProfile();
      }
    } else {
      this._data = this.getDefaultProfile();
    }
    return this._data;
  },

  save(profile) {
    this._data = profile;
    localStorage.setItem('dragon_user_profile', JSON.stringify(profile));
  },

  get() {
    if (!this._data) this.load();
    return this._data;
  },

  update(updates) {
    const profile = { ...this.get(), ...updates };
    this.save(profile);
    return profile;
  },

  openSettingsModal() {
    const profile = this.get();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content profile-modal">
        <h2>设置个人资料</h2>
        <div class="profile-form">
          <div class="form-group">
            <label>昵称</label>
            <input type="text" id="profile-nickname" value="${escapeHtml(profile.nickname)}" maxlength="12" placeholder="输入你的昵称">
          </div>
          <div class="form-group">
            <label>头像 (Emoji)</label>
            <div class="emoji-picker">
              ${['😀','😎','🦊','🐱','🐶','🐰','🐼','🐲','🦄','🌟','🔥','💪','🎮','📚','🎵','🌙','☀️','🍀','💎','🎯'].map(e => `
                <span class="emoji-option ${profile.avatar === e ? 'selected' : ''}" data-emoji="${e}">${e}</span>
              `).join('')}
            </div>
            <div class="form-group" style="margin-top:8px">
              <label>或自定义 Emoji</label>
              <input type="text" id="profile-emoji-custom" value="${escapeHtml(profile.avatar)}" maxlength="2" placeholder="输入一个 emoji" style="width:60px;text-align:center;font-size:24px">
            </div>
          </div>
          <div class="form-group">
            <label>气泡颜色</label>
            <div class="color-picker">
              ${['#7b68ee','#4a90d9','#e8739a','#f5a623','#2c3e50','#27ae60','#e74c3c','#8e44ad','#1abc9c','#34495e'].map(c => `
                <span class="color-option ${profile.color === c ? 'selected' : ''}" data-color="${c}" style="background:${c}"></span>
              `).join('')}
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" id="profile-cancel">取消</button>
            <button class="btn btn-primary" id="profile-save">保存</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('.emoji-option').forEach(el => {
      el.addEventListener('click', () => {
        overlay.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('profile-emoji-custom').value = el.dataset.emoji;
      });
    });

    overlay.querySelectorAll('.color-option').forEach(el => {
      el.addEventListener('click', () => {
        overlay.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
      });
    });

    document.getElementById('profile-emoji-custom').addEventListener('input', function() {
      overlay.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
    });

    document.getElementById('profile-save').addEventListener('click', () => {
      const nickname = document.getElementById('profile-nickname').value.trim() || '龙族新兵';
      const avatarInput = document.getElementById('profile-emoji-custom').value.trim();
      const avatar = avatarInput || this.getDefaultProfile().avatar;
      const selectedColor = overlay.querySelector('.color-option.selected');
      const color = selectedColor ? selectedColor.dataset.color : profile.color;

      this.update({ nickname, avatar: avatar.length > 2 ? avatar[0] : avatar, color });
      document.body.removeChild(overlay);
      this.renderToSidebar();
      if (typeof updateGroupChatUserInfo === 'function') {
        updateGroupChatUserInfo();
      }
    });

    document.getElementById('profile-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  },

  renderToSidebar() {
    const profile = this.get();
    const container = document.getElementById('user-profile');
    if (!container) return;
    container.innerHTML = `
      <div class="user-profile-avatar" style="background:${profile.color}">${profile.avatar}</div>
      <div class="user-profile-info">
        <div class="user-profile-name">${escapeHtml(profile.nickname)}</div>
        <div class="user-profile-status">在线</div>
      </div>
      <div class="user-profile-edit" title="编辑资料">✏️</div>
    `;

    container.querySelector('.user-profile-edit').addEventListener('click', () => {
      this.openSettingsModal();
    });

    container.querySelector('.user-profile-avatar').addEventListener('click', () => {
      this.openSettingsModal();
    });
  }
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
