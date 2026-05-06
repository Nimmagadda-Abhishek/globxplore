require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const { initCronJobs } = require('./modules/notification/cron');
const connectDB = require('./config/db');

const http = require('http');
const { Server } = require('socket.io');
const { initNotificationSocket } = require('./modules/notification/notification.socket');
const { initAlumniChatSocket } = require('./modules/alumni/alumni.chat.socket');

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

const { initNotificationScheduler } = require('./modules/notification/notification.scheduler');

// Initialize Notification Socket logic
initNotificationSocket(io);

// Initialize Alumni Chat real-time socket
initAlumniChatSocket(io);

// Initialize Scheduled Jobs
initNotificationScheduler();
initCronJobs(); // Keep old one if needed, or migration is complete

// Connect to MongoDB
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});
