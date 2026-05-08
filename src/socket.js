const Student = require('./modules/student/model');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected to Socket.io:', socket.id);

    // Staff joins their personal room
    socket.on('join_agent', (agentId) => {
      socket.join(`agent_${agentId}`);
      console.log(`Agent ${agentId} joined their room`);
    });

    // Student portal joins their room
    socket.on('join_student', (studentId) => {
      socket.join(`student_${studentId}`);
      console.log(`Student ${studentId} joined their room`);
    });

    // Mark messages as read
    socket.on('open_conversation', async ({ studentId, agentId }) => {
      try {
        const student = await Student.findById(studentId);
        if (student) {
          let updated = false;
          student.messages.forEach(msg => {
            if (msg.sender === 'student' && msg.status === 'received') {
              msg.status = 'read';
              updated = true;
            }
          });

          if (updated) {
            await student.save();
            // Emit back to agent room that messages are read
            io.to(`agent_${agentId}`).emit('messages_read', { studentId });
          }
        }
      } catch (err) {
        console.error('Socket open_conversation error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;
