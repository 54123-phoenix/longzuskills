const { Server } = require('socket.io');

let online = {};

function init(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('join-group', (info) => {
      socket.join('gc');
      online[socket.id] = { ...info };
      io.to('gc').emit('on', { c: Object.keys(online).length });
    });

    socket.on('gm', (msg) => {
      io.to('gc').emit('gm', msg);
    });

    socket.on('disconnect', () => {
      delete online[socket.id];
      io.to('gc').emit('off', { c: Object.keys(online).length });
    });
  });

  return io;
}

module.exports = { init };
