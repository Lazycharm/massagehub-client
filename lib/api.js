// API Helper Functions - Direct calls to Next.js API routes
// NO BASE44 CLIENT - Direct Supabase + API routes only

// Helper to get auth headers
const getAuthHeaders = (additionalHeaders = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') : null;
  return {
    ...additionalHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

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
  
  // Admin API routes
  users: {
    list: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
  },
  
  settings: {
    list: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create setting');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/settings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/settings/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete setting');
      return res.ok;
    },
  },
  
  auth: {
    login: async (email, password) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Login failed');
      }
      return res.json();
    },
    
    logout: async () => {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Logout failed');
      return res.ok;
    },
    
    me: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch current user');
      return res.json();
    },
    
    updateMe: async (data) => {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
  },
  
  tokens: {
    get: async (userId) => {
      const res = await fetch(`/api/tokens/get?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch tokens');
      return res.json();
    },
    
    list: async () => {
      const res = await fetch('/api/tokens/list');
      if (!res.ok) throw new Error('Failed to fetch token list');
      return res.json();
    },
    
    update: async (userId, amount, operation = 'add') => {
      const res = await fetch('/api/tokens/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount, operation }),
      });
      if (!res.ok) throw new Error('Failed to update tokens');
      return res.json();
    },
  },
  
  userChatrooms: {
    list: async (userId) => {
      const params = userId ? `?user_id=${userId}` : '';
      const res = await fetch(`/api/user-chatrooms${params}`);
      if (!res.ok) throw new Error('Failed to fetch user chatrooms');
      return res.json();
    },
    
    assign: async (userId, chatroomId) => {
      const res = await fetch('/api/user-chatrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, chatroom_id: chatroomId }),
      });
      if (!res.ok) throw new Error('Failed to assign chatroom');
      return res.json();
    },
    
    remove: async (userId, chatroomId) => {
      const res = await fetch('/api/user-chatrooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, chatroom_id: chatroomId }),
      });
      if (!res.ok) throw new Error('Failed to remove chatroom assignment');
      return res.ok;
    },
  },
  
  allMessages: {
    list: async (limit = 500, filters = {}) => {
      const params = new URLSearchParams({ limit, ...filters });
      const res = await fetch(`/api/messages?${params}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
  },
  
  contacts: {
    list: async (chatroom_id) => {
      const params = chatroom_id ? `?chatroom_id=${chatroom_id}` : '';
      const res = await fetch(`/api/contacts${params}`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create contact');
      }
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update contact');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      return res.ok;
    },
  },
  
  groups: {
    list: async () => {
      const res = await fetch('/api/groups');
      if (!res.ok) throw new Error('Failed to fetch groups');
      return res.json();
    },
    
    get: async (id) => {
      const res = await fetch(`/api/groups/${id}`);
      if (!res.ok) throw new Error('Failed to fetch group');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create group');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update group');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete group');
      return res.ok;
    },
    
    addMembers: async (id, contact_ids) => {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids }),
      });
      if (!res.ok) throw new Error('Failed to add members');
      return res.json();
    },
    
    removeMember: async (id, contact_id) => {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      return res.ok;
    },
  },
  
  templates: {
    list: async (type) => {
      const params = type ? `?type=${type}` : '';
      const res = await fetch(`/api/templates${params}`);
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    
    get: async (id) => {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create template');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.ok;
    },
  },
  
  senderNumbers: {
    list: async () => {
      const res = await fetch('/api/sender-numbers', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch sender numbers');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/sender-numbers', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create sender number');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/sender-numbers/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update sender number');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/sender-numbers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete sender number');
      return res.ok;
    },
  },
};
