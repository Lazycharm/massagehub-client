import { supabaseAdmin } from '../../../lib/supabaseClient';

// Test provider connection
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { provider_type, provider_name, credentials } = req.body;

    if (!provider_type || !credentials) {
      return res.status(400).json({ error: 'provider_type and credentials are required' });
    }

    let testResult = { success: false, message: '' };

    // Test based on provider type
    switch (provider_type) {
      case 'sms':
        if (provider_name.toLowerCase().includes('twilio')) {
          testResult = await testTwilio(credentials);
        } else if (provider_name.toLowerCase().includes('base44')) {
          testResult = await testBase44(credentials);
        } else if (provider_name.toLowerCase().includes('infobip')) {
          testResult = await testInfobip(credentials);
        } else {
          testResult = { success: false, message: 'Unknown SMS provider' };
        }
        break;

      case 'email':
        testResult = await testEmail(credentials);
        break;

      case 'viber':
        testResult = await testViber(credentials);
        break;

      case 'whatsapp':
        testResult = await testWhatsApp(credentials);
        break;

      default:
        return res.status(400).json({ error: 'Invalid provider_type' });
    }

    return res.status(200).json(testResult);
  } catch (error) {
    console.error('Error testing provider:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}

// Test Twilio connection
async function testTwilio(credentials) {
  const { accountSid, authToken } = credentials;

  if (!accountSid || !authToken) {
    return { success: false, message: 'Missing accountSid or authToken' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `Connected to Twilio account: ${data.friendly_name}` 
      };
    } else {
      return { 
        success: false, 
        message: `Twilio authentication failed: ${response.statusText}` 
      };
    }
  } catch (error) {
    return { success: false, message: `Twilio connection error: ${error.message}` };
  }
}

// Test Base44 connection
async function testBase44(credentials) {
  const { apiKey } = credentials;

  if (!apiKey) {
    return { success: false, message: 'Missing apiKey' };
  }

  // TODO: Implement actual Base44 API test
  // For now, just validate the key format
  if (apiKey.length < 10) {
    return { success: false, message: 'Invalid API key format' };
  }

  return { 
    success: true, 
    message: 'Base44 credentials validated (test connection not implemented)' 
  };
}

// Test Infobip connection
async function testInfobip(credentials) {
  const { apiKey, baseUrl } = credentials;

  if (!apiKey) {
    return { success: false, message: 'Missing Infobip API key' };
  }

  if (!baseUrl) {
    return { success: false, message: 'Missing Infobip base URL (e.g., https://xxxxx.api.infobip.com)' };
  }

  try {
    // Ensure base URL has protocol
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    console.log('[Test Infobip] Testing connection to:', url);
    console.log('[Test Infobip] API Key:', apiKey?.substring(0, 20) + '...');
    
    // Method 1: Try a simple SMS validation endpoint (doesn't send anything)
    // This tests if the API key is valid without actually sending
    const response = await fetch(`${url}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: []  // Empty messages array to trigger validation
      })
    });

    console.log('[Test Infobip] Response status:', response.status);
    const responseText = await response.text();
    console.log('[Test Infobip] Response body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }

    // Check various success/auth scenarios
    if (response.status === 401 || response.status === 403) {
      // Unauthorized - invalid API key
      return { 
        success: false, 
        message: `Authentication failed: ${responseData.requestError?.serviceException?.text || 'Invalid API key or insufficient permissions'}` 
      };
    } else if (response.status === 400) {
      // Bad request means API key worked but validation failed (expected with empty messages)
      const errorMsg = responseData.requestError?.serviceException?.text || '';
      const validationErrors = responseData.requestError?.serviceException?.validationErrors;
      
      // Check if it's complaining about empty/required messages - this means auth succeeded!
      if (validationErrors?.messages || errorMsg.toLowerCase().includes('empty') || errorMsg.toLowerCase().includes('required')) {
        return { 
          success: true, 
          message: `✅ Connected to Infobip successfully! API key authenticated and SMS API is accessible.` 
        };
      }
      
      return { 
        success: false, 
        message: `Validation error: ${errorMsg}` 
      };
    } else if (response.ok) {
      // Unexpected success (shouldn't happen with empty array but good sign)
      return { 
        success: true, 
        message: `✅ Connected to Infobip successfully! API key is valid.` 
      };
    } else {
      // Other errors
      return { 
        success: false, 
        message: `Connection test failed: ${responseData.requestError?.serviceException?.text || response.statusText}` 
      };
    }
  } catch (error) {
    console.error('[Test Infobip] Exception:', error);
    return { success: false, message: `Connection error: ${error.message}` };
  }
}

// Test Email (SMTP) connection
async function testEmail(credentials) {
  const { smtp_host, smtp_port, smtp_user, smtp_pass } = credentials;

  if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
    return { success: false, message: 'Missing SMTP credentials' };
  }

  // TODO: Implement actual SMTP connection test
  return { 
    success: true, 
    message: 'Email credentials validated (SMTP test not implemented)' 
  };
}

// Test Viber connection
async function testViber(credentials) {
  const { authToken } = credentials;

  if (!authToken) {
    return { success: false, message: 'Missing Viber auth token' };
  }

  try {
    const response = await fetch('https://chatapi.viber.com/pa/get_account_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Viber-Auth-Token': authToken
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 0) {
        return { 
          success: true, 
          message: `Connected to Viber account: ${data.name}` 
        };
      } else {
        return { 
          success: false, 
          message: `Viber error: ${data.status_message}` 
        };
      }
    } else {
      return { 
        success: false, 
        message: `Viber authentication failed: ${response.statusText}` 
      };
    }
  } catch (error) {
    return { success: false, message: `Viber connection error: ${error.message}` };
  }
}

// Test WhatsApp connection
async function testWhatsApp(credentials) {
  const { apiKey, phoneNumberId } = credentials;

  if (!apiKey || !phoneNumberId) {
    return { success: false, message: 'Missing WhatsApp credentials' };
  }

  // TODO: Implement actual WhatsApp Business API test
  return { 
    success: true, 
    message: 'WhatsApp credentials validated (test connection not implemented)' 
  };
}
