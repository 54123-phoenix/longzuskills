let socket = null;
document.addEventListener('DOMContentLoaded', () => {
  UserProfile.load();
  UserProfile.render();
  socket = io();
  socket.on('connect', () => {
    const p = UserProfile.get();
    socket.emit('join-group', { nickname: p.nickname, avatar: p.avatar, color: p.color });
    GroupChat.init(socket);
    PrivateChat.init();
    document.getElementById('group-chat-entry').onclick = showGroup;
    showGroup();
  });
});
function showGroup() {
  document.querySelectorAll('.sidebar-item, .private-chat-item').forEach(e => e.classList.remove('active'));
  document.getElementById('group-chat-entry')?.classList.add('active');
  const main = document.getElementById('main-content');
  let area = document.getElementById('group-chat-area');
  if (!area) { GroupChat.render(); area = document.getElementById('group-chat-area'); }
  main.innerHTML = '';
  if (area) main.appendChild(area);
}
