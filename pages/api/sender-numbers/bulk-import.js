import { supabaseAdmin } from '../../../lib/supabaseClient';
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
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.filepath)
        .pipe(csv())
        .on('data', (row) => {
          // Expected CSV format: label, number_or_id, type, provider, region, active
          if (row.number_or_id) {
            numbers.push({
              label: row.label || row.number_or_id,
              number_or_id: row.number_or_id,
              type: row.type || 'sms',
              provider: row.provider || null,
              region: row.region || null,
              active: row.active === 'Yes' || row.active === 'true' || row.active === '1'
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (numbers.length === 0) {
      return res.status(400).json({ error: 'No valid numbers found in CSV' });
    }

    // Insert numbers into database
    const { data, error } = await supabaseAdmin
      .from('sender_numbers')
      .upsert(numbers, {
        onConflict: 'number_or_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;

    return res.status(200).json({
      imported: data?.length || 0,
      message: `Successfully imported ${data?.length || 0} sender numbers`
    });
  } catch (error) {
    console.error('Error importing sender numbers:', error);
    return res.status(500).json({ error: error.message });
  }
}
