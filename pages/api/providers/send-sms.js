/**
 * Universal SMS sending endpoint
 * Handles multiple providers: Twilio, Infobip, Base44
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { provider_name, credentials, from, to, message } = req.body;

    // Validation
    if (!provider_name || !credentials || !from || !to || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: provider_name, credentials, from, to, message' 
      });
    }

    let result;

    // Route to appropriate provider
    if (provider_name.toLowerCase().includes('twilio')) {
      result = await sendViaTwilio(credentials, from, to, message);
    } else if (provider_name.toLowerCase().includes('infobip')) {
      result = await sendViaInfobip(credentials, from, to, message);
    } else if (provider_name.toLowerCase().includes('base44')) {
      result = await sendViaBase44(credentials, from, to, message);
    } else {
      return res.status(400).json({ error: `Unknown SMS provider: ${provider_name}` });
    }

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('SMS provider error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// ============================================================================
// TWILIO IMPLEMENTATION
// ============================================================================
async function sendViaTwilio(credentials, from, to, message) {
  const { accountSid, authToken } = credentials;

  if (!accountSid || !authToken) {
    return { success: false, error: 'Missing Twilio credentials' };
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    const twilioMessage = await client.messages.create({
      body: message,
      from: from,
      to: to
    });

    return {
      success: true,
      provider: 'twilio',
      message_sid: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      from: twilioMessage.from
    };
  } catch (error) {
    return {
      success: false,
      provider: 'twilio',
      error: error.message,
      code: error.code
    };
  }
}

// ============================================================================
// INFOBIP IMPLEMENTATION
// ============================================================================
async function sendViaInfobip(credentials, from, to, message) {
  const { apiKey, baseUrl } = credentials;

  if (!apiKey || !baseUrl) {
    return { success: false, error: 'Missing Infobip credentials (apiKey, baseUrl)' };
  }

  try {
    // Ensure base URL has protocol
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    const response = await fetch(`${url}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            from: from,
            destinations: [
              { to: to }
            ],
            text: message
          }
        ]
      })
    });

    const data = await response.json();

    if (response.ok && data.messages && data.messages.length > 0) {
      const messageStatus = data.messages[0];
      return {
        success: messageStatus.status.groupName === 'PENDING' || messageStatus.status.groupName === 'DELIVERED',
        provider: 'infobip',
        message_id: messageStatus.messageId,
        status: messageStatus.status.name,
        status_group: messageStatus.status.groupName,
        status_description: messageStatus.status.description,
        to: messageStatus.to,
        from: from,
        bulk_id: data.bulkId
      };
    } else {
      return {
        success: false,
        provider: 'infobip',
        error: data.requestError?.serviceException?.text || 'Failed to send SMS',
        response: data
      };
    }
  } catch (error) {
    return {
      success: false,
      provider: 'infobip',
      error: error.message
    };
  }
}

// ============================================================================
// BASE44 IMPLEMENTATION
// ============================================================================
async function sendViaBase44(credentials, from, to, message) {
  const { apiKey } = credentials;

  if (!apiKey) {
    return { success: false, error: 'Missing Base44 API key' };
  }

  // TODO: Implement Base44 API integration
  return {
    success: false,
    provider: 'base44',
    error: 'Base44 integration not yet implemented'
  };
}
