import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * Test Infobip connection using environment variables
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;

    if (!apiKey || !baseUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Infobip credentials not found in environment variables' 
      });
    }

    console.log('[Test Infobip ENV] Testing with base URL:', baseUrl);
    console.log('[Test Infobip ENV] API Key length:', apiKey?.length);

    // Test connection by fetching account balance
    const response = await fetch(`${baseUrl}/account/1/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    console.log('[Test Infobip ENV] Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[Test Infobip ENV] Success! Balance:', data);
      
      return res.status(200).json({ 
        success: true, 
        message: `✅ Connected to Infobip! Balance: ${data.balance} ${data.currency}`,
        data: data
      });
    } else {
      const errorText = await response.text();
      console.error('[Test Infobip ENV] Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { text: errorText };
      }

      return res.status(response.status).json({ 
        success: false, 
        message: `❌ Infobip authentication failed: ${errorData.requestError?.serviceException?.text || response.statusText}`,
        error: errorData
      });
    }
  } catch (error) {
    console.error('[Test Infobip ENV] Exception:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Connection error: ${error.message}` 
    });
  }
}
