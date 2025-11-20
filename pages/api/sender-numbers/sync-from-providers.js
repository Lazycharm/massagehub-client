import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get all active providers
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('api_providers')
      .select('*')
      .eq('is_active', true);

    if (providersError) throw providersError;

    if (!providers || providers.length === 0) {
      return res.status(200).json({ synced: 0, message: 'No active providers to sync' });
    }

    let totalSynced = 0;
    const syncResults = [];

    // Sync from each provider
    for (const provider of providers) {
      try {
        let numbers = [];

        switch (provider.provider_type) {
          case 'sms':
            if (provider.provider_name.toLowerCase().includes('twilio')) {
              numbers = await syncTwilioNumbers(provider);
            } else if (provider.provider_name.toLowerCase().includes('base44')) {
              numbers = await syncBase44Numbers(provider);
            } else if (provider.provider_name.toLowerCase().includes('infobip')) {
              numbers = await syncInfobipNumbers(provider);
            }
            break;
          
          // Add other provider types as needed
          default:
            console.log(`Sync not implemented for ${provider.provider_type}`);
        }

        // Insert synced numbers into database
        if (numbers.length > 0) {
          for (const number of numbers) {
            const { error } = await supabaseAdmin
              .from('sender_numbers')
              .upsert({
                number_or_id: number.number,
                label: number.label || number.number,
                type: 'sms',
                provider: provider.provider_name,
                region: number.region,
                capabilities: number.capabilities || {},
                active: true
              }, {
                onConflict: 'number_or_id',
                ignoreDuplicates: false
              });

            if (!error) {
              totalSynced++;
            }
          }
        }

        syncResults.push({
          provider: provider.provider_name,
          synced: numbers.length
        });
      } catch (error) {
        console.error(`Error syncing ${provider.provider_name}:`, error);
        syncResults.push({
          provider: provider.provider_name,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      synced: totalSynced,
      results: syncResults
    });
  } catch (error) {
    console.error('Error syncing sender numbers:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Sync numbers from Twilio
async function syncTwilioNumbers(provider) {
  const { accountSid, authToken } = provider.credentials;

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials');
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.incoming_phone_numbers || []).map(num => ({
      number: num.phone_number,
      label: num.friendly_name || num.phone_number,
      region: num.iso_country,
      capabilities: {
        sms: num.capabilities?.sms,
        mms: num.capabilities?.mms,
        voice: num.capabilities?.voice
      }
    }));
  } catch (error) {
    throw new Error(`Failed to sync Twilio numbers: ${error.message}`);
  }
}

// Sync numbers from Base44
async function syncBase44Numbers(provider) {
  const { apiKey } = provider.credentials;

  if (!apiKey) {
    throw new Error('Missing Base44 API key');
  }

  // TODO: Implement Base44 API integration
  // For now, return empty array
  console.log('Base44 sync not yet implemented');
  return [];
}

// Sync numbers from Infobip
async function syncInfobipNumbers(provider) {
  const { apiKey, baseUrl } = provider.credentials;

  if (!apiKey || !baseUrl) {
    throw new Error('Missing Infobip credentials (apiKey, baseUrl)');
  }

  try {
    // Infobip doesn't have a direct API to list all sender IDs
    // Instead, we can list numbers from number masking or specific endpoints
    // For now, this returns empty array - admin will need to manually add numbers
    // Or implement specific Infobip number management endpoints
    
    console.log('Infobip automatic sync not available - numbers must be added manually');
    console.log('Tip: Go to Admin → Sender Numbers and add your Infobip sender IDs manually');
    
    return [];
  } catch (error) {
    throw new Error(`Failed to sync Infobip numbers: ${error.message}`);
  }
}
