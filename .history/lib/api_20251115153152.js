// API Helper Functions - Direct calls to Next.js API routes
// NO BASE44 CLIENT - Direct Supabase + API routes only

export const api = {
  chatrooms: {
    list: async () => {
      const res = await fetch('/api/chatrooms');
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/chatrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create chatroom');
      return res.json();
    },
    
    assignContacts: async (chatroomId, contacts) => {
      const res = await fetch(`/api/chatrooms/${chatroomId}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      if (!res.ok) throw new Error('Failed to assign contacts');
      return res.json();
    },
    
    importCSV: async (chatroomId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatroomId', chatroomId);
      
      const res = await fetch('/api/chatrooms/import-csv', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to import CSV');
      return res.json();
    },
  },
  
  messages: {
    send: async (data) => {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send message');
      }
      return res.json();
    },
    
    listInbound: async () => {
      const res = await fetch('/api/messages/inbound');
      if (!res.ok) throw new Error('Failed to fetch inbound messages');
      return res.json();
    },
  },
  
  // Placeholder for future API routes
  contacts: {
    list: async () => {
      // TODO: Implement /api/contacts
      return [];
    },
  },
  
  groups: {
    list: async () => {
      // TODO: Implement /api/groups
      return [];
    },
  },
  
  templates: {
    list: async () => {
      // TODO: Implement /api/templates
      return [];
    },
  },
};
