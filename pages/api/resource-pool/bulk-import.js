import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resources = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.filepath)
        .pipe(csv())
        .on('data', row => {
          console.log('CSV Row keys:', Object.keys(row)); // Debug log
          console.log('CSV Row values:', row); // Debug log
          
          // Try different possible column name variations
          const phoneNumber = row.phone_number || row['phone_number'] || row.Phone_Number || row['Phone Number'];
          const label = row.label || row['label'] || row.Label;
          const tags = row.tags || row['tags'] || row.Tags;
          const assignedUserEmail = row.assigned_user_email || row['assigned_user_email'] || row['Assigned User Email'];
          const metadata = row.metadata || row['metadata'] || row.Metadata;
          
          console.log('Extracted phone_number:', phoneNumber); // Debug log
          
          if (phoneNumber && phoneNumber.trim()) {
            const resource = {
              phone_number: phoneNumber.trim(),
              label: label?.trim() || phoneNumber.trim(),
              tags: tags
                ? tags.split(/[,;]/).map(t => t.trim()).filter(Boolean)
                : [],
              assigned_user_email: assignedUserEmail?.trim() || null,
              metadata: {},
            };

            // Try to parse metadata if provided
            if (metadata && metadata.trim() && metadata !== '{}') {
              try {
                resource.metadata = JSON.parse(metadata);
              } catch (e) {
                resource.metadata = { raw: metadata };
              }
            }

            resources.push(resource);
            console.log('Added resource:', resource); // Debug log
          } else {
            console.log('Skipped row (no phone_number)'); // Debug log
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('Total resources parsed:', resources.length); // Debug log

    if (resources.length === 0) {
      return res.status(400).json({ error: 'No valid resources found in CSV' });
    }

    // Get unique emails and map to user IDs
    const emails = [
      ...new Set(
        resources
          .map(r => r.assigned_user_email)
          .filter(Boolean)
      ),
    ];

    let emailToIdMap = {};
    if (emails.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('email', emails);

      users?.forEach(user => {
        emailToIdMap[user.email] = user.id;
      });
    }

    // Prepare insertions with user IDs
    const insertions = resources.map(r => ({
      phone_number: r.phone_number,
      first_name: r.label || null,
      tags: r.tags,
      assigned_to_user_id: r.assigned_user_email
        ? emailToIdMap[r.assigned_user_email] || null
        : null,
      assigned_at: r.assigned_user_email && emailToIdMap[r.assigned_user_email]
        ? new Date().toISOString()
        : null,
      status: r.assigned_user_email && emailToIdMap[r.assigned_user_email]
        ? 'assigned'
        : 'available',
      metadata: r.metadata,
    }));

    // Upsert resources (update on conflict with phone_number)
    const { data, error } = await supabaseAdmin
      .from('resource_pool')
      .upsert(insertions, {
        onConflict: 'phone_number',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) throw error;

    const imported = data?.length || 0;
    const skipped = resources.length - imported;

    return res.status(200).json({
      imported,
      skipped,
      message: `Imported ${imported} resources${skipped > 0 ? `, skipped ${skipped}` : ''}`,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ error: error.message });
  }
}
