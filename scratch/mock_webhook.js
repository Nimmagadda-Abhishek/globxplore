const axios = require('axios');

async function mockWebhook() {
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
              "contacts": [
                {
                  "profile": {
                    "name": "Prudhvi"
                  },
                  "wa_id": "917995936112"
                }
              ],
              "messages": [
                {
                  "from": "917995936112",
                  "id": "wamid.HBgLOTExNzk5NTkzNjExMhUCABEYEjA0RjY0QjY0QjY0QjY0QjY0AA==",
                  "timestamp": "1715091600",
                  "text": {
                    "body": "Hello GlobXplorer! I have a question about my visa application."
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

mockWebhook();
