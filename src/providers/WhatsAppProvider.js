const axios = require('axios');

class WhatsAppProvider {
  /**
   * Send a direct text message via Meta Cloud API
   */
  static async sendRawNotification(to, text) {
    try {
      const url = `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_ID}/messages`;
      
      const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.WA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp Direct Message Sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('WhatsApp Provider Error (Raw):', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Send the gx_chat_alert_v2 template
   */
  static async sendChatAlertTemplate(to, studentName, portalUrl) {
    try {
      const url = `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_ID}/messages`;

      const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: 'gx_chat_alert_v2',
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: studentName },
                { type: 'text', text: 'Counsellor' }, // Defaulting role as per generic alert logic
                { type: 'text', text: portalUrl }
              ]
            }
          ]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.WA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp Template Sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('WhatsApp Provider Error (Template):', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Normalize phone number for WhatsApp
   */
  static normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '91' + cleaned;
    return cleaned;
  }
}

module.exports = WhatsAppProvider;
