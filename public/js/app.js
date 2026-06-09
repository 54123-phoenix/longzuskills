let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  UserProfile.load();
  UserProfile.renderToSidebar();

  socket = io();

  socket.on('connect', () => {
    const profile = UserProfile.get();
    socket.emit('join-group', {
      nickname: profile.nickname,
      avatar: profile.avatar,
      color: profile.color
    });

    GroupChat.init(socket);
    PrivateChat.init();

    document.getElementById('group-chat-entry').addEventListener('click', () => {
      showGroupChat();
    });

    showGroupChat();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
    document.getElementById('main-content').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:18px">
        ⚠️ 无法连接到服务器，请确保服务已启动
      </div>
    `;
  });
});

function showGroupChat() {
  document.querySelectorAll('.sidebar-item, .private-chat-item').forEach(el => el.classList.remove('active'));
  const entry = document.getElementById('group-chat-entry');
  if (entry) entry.classList.add('active');

  const area = document.getElementById('group-chat-area');
  if (!area) {
    GroupChat.render();
  } else {
    area.classList.remove('hidden');
  }

  const main = document.getElementById('main-content');
  const rendered = document.getElementById('group-chat-area');
  main.innerHTML = '';
  main.appendChild(rendered);
  GroupChat.renderMessages();
}
