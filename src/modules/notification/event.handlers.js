const EventEmitter = require('events');
const notificationService = require('./service');
const User = require('../user/model');

class EventBus extends EventEmitter {}
const eventBus = new EventBus();

// Helper to notify all admins
const notifyAdmins = async (eventKey, data) => {
  const admins = await User.find({ role: 'ADMIN' });
  for (const admin of admins) {
    await notificationService.triggerNotification({
      userId: admin._id,
      eventKey,
      data,
      channels: ['app']
    });
  }
};

// --- Lead & Telecaller Events ---
eventBus.on('lead:assigned', async (data) => {
  await notificationService.triggerNotification({
    userId: data.assigneeId,
    eventKey: 'LEAD_ASSIGNED',
    data,
    channels: ['app', 'whatsapp', 'email']
  });
});

eventBus.on('lead:callback_due', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'CALLBACK_DUE',
    data,
    channels: ['app']
  });
});

// --- Student Events ---
eventBus.on('student:stage_changed', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'APPLICATION_STAGE_CHANGED',
    data,
    channels: ['app', 'whatsapp', 'email']
  });
});

eventBus.on('student:docs_required', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'DOCUMENTS_REQUIRED',
    data,
    channels: ['app', 'whatsapp']
  });
});

eventBus.on('payment:pending', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'PAYMENT_PENDING',
    data,
    channels: ['app', 'whatsapp', 'email']
  });
});

eventBus.on('payment:success', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'PAYMENT_SUCCESS',
    data,
    channels: ['app', 'whatsapp', 'email']
  });
});

// --- Admin & Manager Events ---
eventBus.on('registration:pending', async (data) => {
  await notifyAdmins('NEW_REGISTRATION_PENDING', data);
});

eventBus.on('system:escalation', async (data) => {
  await notifyAdmins('ESCALATION_RAISED', data);
});

// --- Agent Events ---
eventBus.on('agent:commission_credited', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'COMMISSION_CREDITED',
    data,
    channels: ['app', 'whatsapp']
  });
});

// --- Visa Events ---
eventBus.on('visa:slot_available', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'VISA_SLOT_AVAILABLE',
    data,
    channels: ['app', 'whatsapp']
  });
});

eventBus.on('visa:result', async (data) => {
  await notificationService.triggerNotification({
    userId: data.userId,
    eventKey: 'VISA_RESULT',
    data,
    channels: ['app', 'whatsapp', 'email']
  });
});

// --- Alumni Events ---
eventBus.on('alumni:connect_request', async (data) => {
  await notificationService.triggerNotification({
    userId: data.alumniId,
    eventKey: 'ALUMNI_REQUEST',
    data,
    channels: ['app', 'whatsapp', 'email']
  });
});

module.exports = eventBus;
