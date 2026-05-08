const nodemailer = require('nodemailer');

class EmailProvider {
  constructor() {
    const config = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };

    // If using Gmail, use the 'service' property for better compatibility
    if (process.env.EMAIL_HOST === 'smtp.gmail.com') {
      delete config.host;
      delete config.port;
      config.service = 'gmail';
    }

    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail({ to, subject, html, attachments = [] }) {
    try {
      if (!process.env.EMAIL_USER) {
        console.warn('Email credentials not configured. Logging message instead.');
        console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
        return { success: true, mock: true };
      }

      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'GlobXplorer'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@globxplorer.com'}>`,
        to,
        subject,
        html,
        attachments,
      });

      console.log(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email Provider Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailProvider();
