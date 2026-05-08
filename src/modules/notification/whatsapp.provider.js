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
   * Normalize phone number to E.164 format (removing +, spaces, etc.)
   */
  normalizePhone(phone) {
    if (!phone) return '';
    // Remove all non-numeric characters
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Ensure it doesn't have leading 00
    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
    
    // If it's 10 digits, prepend 91 (default for India)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Send a template-based WhatsApp message
   */
  async sendTemplate(to, templateName, language = 'en', components = []) {
    try {
      const normalizedTo = this.normalizePhone(to);
      if (!this.accessToken) {
        console.warn('WhatsApp Access Token not configured. Logging message instead.');
        console.log(`[WHATSAPP MOCK] To: ${normalizedTo}, Template: ${templateName}, Language: ${language}`);
        return { success: true, mock: true };
      }

      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: normalizedTo,
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

      console.log(`WhatsApp template (${templateName}) sent successfully to ${normalizedTo}. Message ID: ${response.data.messages?.[0]?.id}`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error('WhatsApp Provider Error (Template):', JSON.stringify(errorData, null, 2));
      return { success: false, error: errorData };
    }
  }

  /**
   * Send a direct text message (requires customer to have replied within 24h)
   */
  async sendMessage(to, text) {
    try {
      const normalizedTo = this.normalizePhone(to);
      if (!this.accessToken) {
        console.warn('WhatsApp Access Token not configured. Logging message instead.');
        console.log(`[WHATSAPP MOCK] To: ${normalizedTo}, Text: ${text}`);
        return { success: true, mock: true };
      }

      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: normalizedTo,
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

      console.log(`WhatsApp text message sent successfully to ${normalizedTo}. Message ID: ${response.data.messages?.[0]?.id}`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error('WhatsApp Provider Error (Text):', JSON.stringify(errorData, null, 2));
      return { success: false, error: errorData };
    }
  }
}

module.exports = new WhatsAppProvider();
