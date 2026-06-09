(function() {
let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  const UP = window.UserProfile;
  UP.load(); UP.render();

  if (localStorage.getItem('dark')==='1') document.body.classList.add('dark');
  const tm = document.getElementById('theme-btn');
  if (tm) {
    tm.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    tm.onclick = () => {
      const d = document.body.classList.toggle('dark');
      localStorage.setItem('dark', d?'1':'0');
      tm.textContent = d ? '☀️' : '🌙';
    };
  }

  socket = io();
  socket.on('connect', () => {
    const p = UP.get();
    socket.emit('join-group', { nickname: p.nickname, avatar: p.avatar, color: p.color });
    window.GroupChat.init(socket);
    window.PrivateChat.init();
    document.getElementById('group-chat-entry').onclick = showGroup;
    showGroup();
  });

  socket.on('connect_error', () => {
    document.getElementById('main-content').innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-light);font-size:16px;padding:20px">⚠️ 无法连接服务器<br><span style="font-size:12px;margin-top:6px;display:block"><code>node server.js</code></span></div>`;
  });
});

function showGroup() {
  document.querySelectorAll('.sidebar-item, .private-chat-item').forEach(e => e.classList.remove('active'));
  document.getElementById('group-chat-entry')?.classList.add('active');
  const main = document.getElementById('main-content');
  let area = document.getElementById('group-chat-area');
  if (!area) { window.GroupChat.render(); area = document.getElementById('group-chat-area'); }
  main.innerHTML = '';
  if (area) main.appendChild(area);
}
})();
