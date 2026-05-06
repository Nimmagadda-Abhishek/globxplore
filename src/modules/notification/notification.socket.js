let io;

const initNotificationSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a personal room based on userId
    socket.on('join_room', (userId) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`User ${userId} joined their personal room`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

const sendRealTimeNotification = (userId, notification) => {
  if (io && userId) {
    io.to(userId.toString()).emit('new_notification', notification);
  }
};

const updateUnreadCount = (userId, count) => {
  if (io && userId) {
    io.to(userId.toString()).emit('unread_count_updated', { unreadCount: count });
  }
};

module.exports = {
  initNotificationSocket,
  sendRealTimeNotification,
  updateUnreadCount,
};
