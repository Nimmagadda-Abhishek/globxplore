const templates = {
  // --- Global / System ---
  SYSTEM_ALERT: {
    title: 'System Alert',
    message: '{{message}}',
    whatsapp: 'gx_system_alert',
    email: (data) => `<h1>System Alert</h1><p>${data.message}</p>`,
  },

  // --- Student Events ---
  APPLICATION_STAGE_CHANGED: {
    title: 'Application Status Update',
    message: 'Hi {{name}}, your application moved to {{stage}}',
    whatsapp: 'gx_application_update',
    email: (data) => `<h1>Application Update</h1><p>Hi ${data.name}, your application status has been updated to <strong>${data.stage}</strong>.</p>`,
  },
  PROMOTION_SUCCESS: {
    title: 'Account Activated',
    message: 'Your GlobXplorer account is now active. Please check your registered email for login details and instructions.',
    whatsapp: 'gx_account_ready',
    email: (data) => `
      <h1>Welcome to GlobXplorer!</h1>
      <p>Hi ${data.name},</p>
      <p>Your student account has been created successfully.</p>
      <p><strong>Login ID:</strong> ${data.gxId}</p>
      <p><strong>Temporary Password:</strong> ${data.password}</p>
      <p>Login here: <a href="https://gxcrm.com">gxcrm.com</a></p>
    `,
  },
  PAYMENT_PENDING: {
    title: 'Payment Reminder',
    message: 'Your payment of ₹{{amount}} is pending',
    whatsapp: 'gx_payment_reminder',
    email: (data) => `<h1>Payment Pending</h1><p>Hi ${data.name}, your payment of ₹${data.amount} is currently pending.</p><a href="${data.actionUrl}">Pay Now</a>`,
  },
  PAYMENT_REQUESTED: {
    title: 'New Payment Request',
    message: 'A new payment request of ₹{{amount}} has been created: {{title}}',
    whatsapp: 'gx_payment_request',
    email: (data) => `<h1>Payment Request</h1><p>Hi ${data.name}, a new payment request for <strong>${data.title}</strong> has been created for ₹${data.amount}.</p><a href="${data.actionUrl}">View & Pay</a>`,
  },
  PAYMENT_SUCCESS: {
    title: 'Payment Received',
    message: 'Payment of ₹{{amount}} received successfully!',
    whatsapp: 'gx_payment_success',
    email: (data) => `<h1>Payment Success</h1><p>We have received your payment of ₹${data.amount}.</p>`,
  },
  DOCUMENTS_REQUIRED: {
    title: 'Action Required: Missing Documents',
    message: 'Hi {{name}}, please upload missing documents for {{stage}} stage',
    whatsapp: 'gx_missing_docs',
    email: (data) => `<h1>Documents Required</h1><p>Please upload the required documents to proceed with your application.</p>`,
  },
  INTERVIEW_SCHEDULED: {
    title: 'Interview Scheduled',
    message: 'Interview scheduled on {{date}} at {{time}}',
    whatsapp: 'gx_interview_scheduled',
    email: (data) => `<h1>Interview Scheduled</h1><p>Hi ${data.name}, an interview is scheduled for ${data.date} at ${data.time}.</p>`,
  },
  VISA_CLIENT_CREDENTIALS: {
    title: 'Visa Portal Credentials',
    message: 'Your Visa portal access is now ready. Please check your registered email for login details and instructions.',
    whatsapp: 'gx_visa_ready',
    email: (data) => `
      <h1>Visa Portal Access Ready</h1>
      <p>Hi ${data.name},</p>
      <p>Your Visa portal account has been created. Use the credentials below to track your application.</p>
      <p><strong>Login ID:</strong> ${data.gxId}</p>
      <p><strong>Temporary Password:</strong> ${data.password}</p>
    `,
  },
  VISA_RESULT: {
    title: 'Visa Result Update',
    message: 'Your visa application result is out: {{result}}',
    whatsapp: 'gx_visa_result',
    email: (data) => `<h1>Visa Result</h1><p>Your visa application result: <strong>${data.result}</strong></p>`,
  },
  VISA_STAGE_UPDATE: {
    title: 'Visa Application Update',
    message: 'Hi {{name}}, your visa application for {{country}} is now at the {{stage}} stage.',
    whatsapp: 'gx_visa_update',
    email: (data) => `<h1>Visa Update</h1><p>Hi ${data.name}, your visa application for ${data.country} has moved to: <strong>${data.stage}</strong>.</p>`,
  },
  DOCUMENT_VERIFIED: {
    title: 'Document Verified',
    message: 'Hi {{name}}, your {{category}} has been verified successfully.',
    whatsapp: 'gx_doc_verified',
    email: (data) => `<h1>Document Approved</h1><p>Your <strong>${data.category}</strong> has been verified.</p>`,
  },
  DOCUMENT_REJECTED: {
    title: 'Document Rejected',
    message: 'Hi {{name}}, your {{category}} was rejected. Reason: {{reason}}. Please re-upload.',
    whatsapp: 'gx_doc_rejected',
    email: (data) => `<h1>Document Action Required</h1><p>Your ${data.category} was rejected due to: ${data.reason}. Please upload a clear copy.</p>`,
  },
  OFFER_LETTER_RECEIVED: {
    title: 'Offer Letter Update',
    message: 'An offer letter has been issued for {{name}} from {{university}}.',
    whatsapp: 'gx_offer_received',
    email: (data) => `<h1>Offer Letter Update</h1><p>An offer letter from <strong>${data.university}</strong> has been received for ${data.name}.</p>`,
  },
  APPLICATION_SUBMITTED: {
    title: 'Application Submitted',
    message: 'Hi {{name}}, your application to {{university}} has been submitted successfully.',
    whatsapp: 'gx_app_submitted',
    email: (data) => `<h1>Application Sent</h1><p>Your application to ${data.university} has been submitted.</p>`,
  },
  GENERIC_CHAT_ALERT: {
    title: 'New Message Notification',
    message: 'Notification: You have a new message from {{senderName}} regarding your application. View: {{link}}',
    whatsapp: 'gx_chat_alert_v2',
    email: (data) => `<h1>New Message</h1><p>You have a new message from ${data.senderName}.</p><a href="${data.link}">View Message</a>`,
  },

  // --- Admin / Manager Events ---
  NEW_REGISTRATION_PENDING: {
    title: 'New Registration Approval',
    message: 'New registration from {{name}} ({{role}}) pending approval',
    whatsapp: 'gx_admin_registration',
    email: (data) => `<h1>Approval Required</h1><p>New registration: ${data.name} (${data.role}).</p>`,
  },
  ESCALATION_RAISED: {
    title: 'Critical Escalation raised',
    message: 'Escalation raised for Student {{gxId}}: {{reason}}',
    whatsapp: 'gx_escalation_alert',
    email: (data) => `<h1>Escalation Alert</h1><p>Reason: ${data.reason}</p>`,
  },

  // --- Agent / Telecaller Events ---
  LEAD_ASSIGNED: {
    title: 'New Lead Assigned',
    message: 'New lead assigned: {{leadName}}',
    whatsapp: 'gx_lead_assigned',
    email: (data) => `<h1>New Lead</h1><p>You have been assigned: ${data.leadName} (${data.leadPhone}).</p>`,
  },
  CALLBACK_DUE: {
    title: 'Callback Reminder',
    message: 'Callback due for {{leadName}} now!',
    whatsapp: 'gx_callback_reminder',
    email: (data) => `<h1>Callback Reminder</h1><p>Time to call back ${data.leadName}.</p>`,
  },
  COMMISSION_CREDITED: {
    title: 'Commission Credited',
    message: '₹{{amount}} commission credited for Student {{studentName}}',
    whatsapp: 'gx_commission_credited',
    email: (data) => `<h1>Commission Update</h1><p>₹${data.amount} credited for ${data.studentName}.</p>`,
  },

  // --- Visa Agent Events ---
  VISA_SLOT_AVAILABLE: {
    title: 'Visa Slot Alert',
    message: 'A visa slot is available for {{location}} on {{date}}',
    whatsapp: 'gx_visa_slot_alert',
    email: (data) => `<h1>Visa Slot Available</h1><p>Location: ${data.location}, Date: ${data.date}</p>`,
  },

  // --- Alumni Events ---
  ALUMNI_REQUEST: {
    title: 'New Student Connectivity Request',
    message: 'Student {{studentName}} wants to connect regarding {{university}}',
    whatsapp: 'gx_alumni_connect',
    email: (data) => `<h1>Connection Request</h1><p>${data.studentName} wants to connect.</p>`,
  },

  // --- Marketing & Broadcast ---
  MARKETING_CAMPAIGN: {
    title: '{{title}}',
    message: '{{message}}',
    whatsapp: 'gx_marketing_general',
    email: (data) => `<h1>${data.title}</h1><p>${data.message}</p><a href="${data.actionUrl}">Learn More</a>`,
  },
  PREMIUM_OFFER: {
    title: 'Exclusive Offer for You!',
    message: 'Hi {{name}}, unlock your premium study abroad package today at {{discount}}% off!',
    whatsapp: 'gx_premium_offer',
    email: (data) => `<h1>Special Offer</h1><p>Hi ${data.name}, we have a special discount for you!</p>`,
  },
  WEBINAR_INVITE: {
    title: 'Webinar Invitation',
    message: 'Join our webinar on "{{topic}}" scheduled for {{date}}',
    whatsapp: 'gx_webinar_invite',
    email: (data) => `<h1>Webinar Invitation</h1><p>Topic: ${data.topic}<br>Date: ${data.date}</p><a href="${data.link}">Register Now</a>`,
  },
};

const interpolate = (str, data) => {
  if (typeof str !== 'string') return str;
  return str.replace(/{{(\w+)}}/g, (match, key) => data[key] || match);
};

module.exports = {
  templates,
  interpolate,
};
