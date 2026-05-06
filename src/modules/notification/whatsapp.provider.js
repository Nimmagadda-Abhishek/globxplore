const axios = require('axios');

/**
 * WhatsApp Provider for Meta Cloud API
 */
class WhatsAppProvider {
  constructor() {
    this.apiUrl = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  /**
   * Send a template-based WhatsApp message
   */
  async sendTemplate(to, templateName, language = 'en', components = []) {
    try {
      if (!this.accessToken) {
        console.warn('WhatsApp Access Token not configured. Logging message instead.');
        console.log(`[WHATSAPP MOCK] To: ${to}, Template: ${templateName}, Language: ${language}`);
        return { success: true, mock: true };
      }

      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language,
            },
            components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('WhatsApp Provider Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Send a direct text message (requires customer to have replied within 24h)
   */
  async sendMessage(to, text) {
    try {
      if (!this.accessToken) {
        console.warn('WhatsApp Access Token not configured. Logging message instead.');
        console.log(`[WHATSAPP MOCK] To: ${to}, Text: ${text}`);
        return { success: true, mock: true };
      }

      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('WhatsApp Provider Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

module.exports = new WhatsAppProvider();
