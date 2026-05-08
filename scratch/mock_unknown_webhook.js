const axios = require('axios');

async function mockUnknownWebhook() {
  const payload = {
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "1090618947472221",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550345678",
                "phone_number_id": "1090618947472221"
              },
              "messages": [
                {
                  "from": "919999999999",
                  "id": "wamid.unknown",
                  "timestamp": "1715091600",
                  "text": {
                    "body": "Hi, I want to know more about your services."
                  },
                  "type": "text"
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post('http://localhost:3000/api/webhooks/whatsapp', payload);
    console.log('Response:', response.status, response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

mockUnknownWebhook();
