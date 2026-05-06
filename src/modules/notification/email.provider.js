const nodemailer = require('nodemailer');

class EmailProvider {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
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
