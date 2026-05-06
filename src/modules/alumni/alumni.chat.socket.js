const { AlumniChatMessage } = require('./model');
const { AlumniService } = require('./alumni.model');
const jwt = require('jsonwebtoken');

/**
 * Initialize real-time alumni chat socket events.
 * This extends the existing Socket.IO server (already used for notifications).
 *
 * Events:
 *  - alumni:join_chat   { serviceId, otherUserId } — join a chat room for a service
 *  - alumni:send        { serviceId, message, receiverId } — send a message
 *  - alumni:typing      { serviceId, otherUserId } — notify the other user is typing
 *  - alumni:read        { serviceId, otherUserId } — mark messages as read
 *
 * Emits:
 *  - alumni:new_message — real-time message object
 *  - alumni:typing      — typing indicator
 *  - alumni:read        — read receipts
 */
const initAlumniChatSocket = (io) => {
  // Use a separate namespace to keep it clean
  const chatNs = io.of('/alumni-chat');

  chatNs.use((socket, next) => {
    // Authenticate via JWT token passed as query param or auth header
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  chatNs.on('connection', (socket) => {
    const userId = socket.user.id || socket.user._id;
    console.log(`[AlumniChat] User ${userId} connected`);

    // Join a personal room so we can push notifications to a specific user
    socket.join(`user:${userId}`);

    /**
     * Join the chat room for a specific service + the two parties involved.
     * Room name: alumni_chat:<serviceId>:<sortedUserIds>
     */
    socket.on('alumni:join_chat', ({ serviceId, otherUserId }) => {
      if (!serviceId || !otherUserId) return;
      const roomId = buildRoomId(serviceId, userId, otherUserId);
      socket.join(roomId);
      console.log(`[AlumniChat] User ${userId} joined room ${roomId}`);
    });

    /**
     * Send a real-time message.
     * Also persists to MongoDB so history is always available.
     */
    socket.on('alumni:send', async ({ serviceId, message, receiverId }) => {
      if (!serviceId || !message) return;

      try {
        // Determine receiver: if student, auto-resolve alumni from service
        let finalReceiverId = receiverId;
        if (!finalReceiverId) {
          const service = await AlumniService.findById(serviceId).select('alumniId');
          if (service) finalReceiverId = service.alumniId?.toString();
        }
        if (!finalReceiverId) return;

        // Persist to DB
        const saved = await AlumniChatMessage.create({
          sender: userId,
          receiver: finalReceiverId,
          serviceId,
          message,
        });

        const populated = await AlumniChatMessage.findById(saved._id)
          .populate('sender', 'name gxId')
          .populate('receiver', 'name gxId');

        const payload = {
          _id: populated._id,
          sender: populated.sender,
          receiver: populated.receiver,
          serviceId,
          message: populated.message,
          createdAt: populated.createdAt,
        };

        // Emit to the shared chat room (both parties see it instantly)
        const roomId = buildRoomId(serviceId, userId, finalReceiverId);
        chatNs.to(roomId).emit('alumni:new_message', payload);

        // Also push to the receiver's personal room in case they're on a different page
        chatNs.to(`user:${finalReceiverId}`).emit('alumni:new_message', payload);
      } catch (err) {
        console.error('[AlumniChat] Error saving message:', err.message);
        socket.emit('alumni:error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicator — forward to the other party in the room
     */
    socket.on('alumni:typing', ({ serviceId, otherUserId, isTyping }) => {
      if (!serviceId || !otherUserId) return;
      const roomId = buildRoomId(serviceId, userId, otherUserId);
      socket.to(roomId).emit('alumni:typing', { senderId: userId, isTyping });
    });

    /**
     * Mark all messages from otherUserId in this service chat as read
     */
    socket.on('alumni:read', async ({ serviceId, otherUserId }) => {
      if (!serviceId || !otherUserId) return;
      await AlumniChatMessage.updateMany(
        { sender: otherUserId, receiver: userId, serviceId, isRead: false },
        { isRead: true }
      );
      const roomId = buildRoomId(serviceId, userId, otherUserId);
      chatNs.to(roomId).emit('alumni:read', { readBy: userId, serviceId });
    });

    socket.on('disconnect', () => {
      console.log(`[AlumniChat] User ${userId} disconnected`);
    });
  });
};

/**
 * Build a deterministic room ID so both users always end up in the same room,
 * regardless of who initiates.
 */
function buildRoomId(serviceId, userA, userB) {
  const sorted = [userA.toString(), userB.toString()].sort();
  return `alumni_chat:${serviceId}:${sorted[0]}:${sorted[1]}`;
}

module.exports = { initAlumniChatSocket };
