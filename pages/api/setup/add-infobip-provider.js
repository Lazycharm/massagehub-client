import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * Quick setup endpoint to add Infobip provider
 * POST /api/setup/add-infobip-provider
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Setting up Infobip provider...');

    // Check if Infobip provider already exists
    const { data: existing } = await supabaseAdmin
      .from('api_providers')
      .select('id, provider_name, is_active')
      .eq('provider_name', 'Infobip')
      .maybeSingle();

    if (existing) {
      console.log('ℹ️  Infobip provider already exists');
      return res.status(200).json({
        success: true,
        message: 'Infobip provider already configured',
        provider: existing,
        alreadyExists: true
      });
    }

    // Insert Infobip provider
    const { data: provider, error } = await supabaseAdmin
      .from('api_providers')
      .insert({
        provider_type: 'sms',
        provider_name: 'Infobip',
        credentials: {
          apiKey: '7024f97779c5fae4c85c491bd91c2ed1-28a6aae6-65f7-4a7b-989b-c7457456baa8',
          baseUrl: 'https://d9qeqv.api.infobip.com'
        },
        config: {
          description: 'Infobip SMS Provider',
          features: ['sms', 'alphanumeric_sender', 'delivery_reports']
        },
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating Infobip provider:', error);
      throw error;
    }

    console.log('✅ Infobip provider created successfully!');
    console.log('   Provider ID:', provider.id);
    console.log('   Base URL: https://d9qeqv.api.infobip.com');
    console.log('   Status: Active');

    // Test the connection
    console.log('🧪 Testing connection...');
    let testResult = null;

    try {
      const testResponse = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/providers/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: 'sms',
          provider_name: 'Infobip',
          credentials: provider.credentials
        })
      });

      testResult = await testResponse.json();
      
      if (testResult.success) {
        console.log('✅ Connection test successful:', testResult.message);
      } else {
        console.log('⚠️  Connection test failed:', testResult.message);
      }
    } catch (testError) {
      console.log('⚠️  Could not test connection:', testError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Infobip provider created successfully!',
      provider: {
        id: provider.id,
        provider_type: provider.provider_type,
        provider_name: provider.provider_name,
        base_url: 'https://d9qeqv.api.infobip.com',
        is_active: provider.is_active
      },
      connectionTest: testResult,
      nextSteps: [
        'Go to Admin → Providers to verify',
        'Add sender numbers in Admin → Sender Numbers',
        'Link sender numbers to chatrooms',
        'Assign chatrooms to users',
        'Start sending messages!'
      ]
    });

  } catch (error) {
    console.error('❌ Setup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
