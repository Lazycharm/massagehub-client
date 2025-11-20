import { supabaseAdmin } from '../../../../lib/supabaseClient';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const numbers = [];
    
    // Parse CSV file
    // Expected format: user_email, real_number, provider, label, chatroom_id, daily_message_limit
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.filepath)
        .pipe(csv())
        .on('data', (row) => {
          if (row.user_email && row.real_number && row.provider) {
            numbers.push({
              user_email: row.user_email,
              real_number: row.real_number,
              provider: row.provider,
              label: row.label || row.real_number,
              chatroom_id: row.chatroom_id || null,
              daily_message_limit: parseInt(row.daily_message_limit) || 500
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (numbers.length === 0) {
      return res.status(400).json({ error: 'No valid numbers found in CSV' });
    }

    // Get user IDs from emails
    const emails = [...new Set(numbers.map(n => n.user_email))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('email', emails);

    const emailToIdMap = {};
    users?.forEach(u => {
      emailToIdMap[u.email] = u.id;
    });

    // Prepare insertions
    const insertions = numbers
      .filter(n => emailToIdMap[n.user_email])
      .map(n => ({
        user_id: emailToIdMap[n.user_email],
        real_number: n.real_number,
        provider: n.provider,
        label: n.label,
        assigned_chatroom_id: n.chatroom_id,
        daily_message_limit: n.daily_message_limit,
        is_active: true
      }));

    if (insertions.length === 0) {
      return res.status(400).json({ error: 'No valid users found for provided emails' });
    }

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('user_real_numbers')
      .upsert(insertions, {
        onConflict: 'user_id,real_number,provider',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    return res.status(200).json({
      imported: data?.length || 0,
      skipped: numbers.length - insertions.length,
      message: `Successfully imported ${data?.length || 0} mini-chatrooms`
    });
  } catch (error) {
    console.error('Error importing user real numbers:', error);
    return res.status(500).json({ error: error.message });
  }
}
