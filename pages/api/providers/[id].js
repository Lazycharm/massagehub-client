import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('api_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching provider:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.created_at;
      delete updates.created_by;

      const { data, error } = await supabaseAdmin
        .from('api_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({ error: 'Provider not found' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error updating provider:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Check if provider is in use by checking if any chatrooms reference this provider
      console.log('[Delete Provider] Checking if provider is in use:', id);
      
      const { data: chatrooms, error: chatroomError } = await supabaseAdmin
        .from('chatrooms')
        .select('id, name')
        .eq('provider_account_id', id)
        .limit(1);

      if (chatroomError) {
        console.error('[Delete Provider] Error checking chatrooms:', chatroomError);
        // If the column doesn't exist, just proceed with deletion
        if (chatroomError.code === '42703') {
          console.log('[Delete Provider] provider_account_id column not found, proceeding with delete');
        } else {
          throw chatroomError;
        }
      }

      if (chatrooms && chatrooms.length > 0) {
        console.log('[Delete Provider] Provider is in use by chatroom:', chatrooms[0].name);
        return res.status(400).json({ 
          error: `Cannot delete provider that is in use by chatroom: ${chatrooms[0].name}` 
        });
      }

      console.log('[Delete Provider] Provider not in use, proceeding with deletion');

      const { error: deleteError } = await supabaseAdmin
        .from('api_providers')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[Delete Provider] Delete error:', deleteError);
        throw deleteError;
      }

      console.log('[Delete Provider] Successfully deleted provider:', id);
      return res.status(200).json({ message: 'Provider deleted successfully' });
    } catch (error) {
      console.error('[Delete Provider] Unexpected error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
