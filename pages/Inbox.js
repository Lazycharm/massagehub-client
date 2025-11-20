import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Search, MessageSquare, Send, Phone } from 'lucide-react';

/**
 * Inbox - Simplified 3-Panel Layout
 * Column 1: Chatrooms (User's assigned chatrooms)
 * Column 2: Contacts (Contacts in selected chatroom)
 * Column 3: Chat Window (Messages with selected contact)
 */
export default function Inbox() {
  const [selectedChatroom, setSelectedChatroom] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');

  // Fetch user's chatrooms
  const { data: chatrooms = [], isLoading: loadingChatrooms } = useQuery({
    queryKey: ['myChatrooms'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-chatrooms/my-chatrooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Fetch contacts for selected chatroom
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['chatroomContacts', selectedChatroom?.chatroom_id],
    queryFn: async () => {
      if (!selectedChatroom) return [];
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/chatrooms/${selectedChatroom.chatroom_id}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    enabled: !!selectedChatroom,
  });

  // Fetch messages for selected contact
  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['contactMessages', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/contacts/${selectedContact.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

  // Filter contacts by search
  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone_number?.includes(searchTerm)
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact || !selectedChatroom) return;

    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatroom_id: selectedChatroom.chatroom_id,
          to_number: selectedContact.phone_number,
          content: messageInput,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || 'Failed to send message');
      }

      setMessageInput('');
      refetchMessages();
    } catch (error) {
      console.error('Send message error:', error);
      alert(`Failed to send message: ${error.message}`);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-4">{/* Panel 1: Chatrooms */}
      <Card className="w-80 flex flex-col shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">My Chatrooms</h2>
          <p className="text-xs text-gray-500">{chatrooms.length} available</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingChatrooms ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : chatrooms.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No chatrooms assigned</p>
              <p className="text-xs text-gray-400 mt-1">Contact your admin</p>
            </div>
          ) : (
            <div className="divide-y">
              {chatrooms.map((cr) => (
                <div
                  key={cr.chatroom_id}
                  onClick={() => {
                    setSelectedChatroom(cr);
                    setSelectedContact(null);
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedChatroom?.chatroom_id === cr.chatroom_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cr.chatroom?.name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-500 mt-1">{cr.chatroom?.provider}</p>
                    </div>
                    <Badge variant="secondary">{cr.contact_count || 0}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Panel 2: Contacts */}
      <Card className="w-80 flex flex-col shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {selectedChatroom ? `${selectedChatroom.chatroom?.name} Contacts` : 'Select a Chatroom'}
          </h2>
          {selectedChatroom && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {!selectedChatroom ? (
            <div className="p-8 text-center text-gray-500">
              Select a chatroom to view contacts
            </div>
          ) : loadingContacts ? (
            <div className="p-4 text-center text-gray-500">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No contacts yet</p>
              <p className="text-xs text-gray-400 mt-1">Import from Resources page</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedContact?.id === contact.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.phone_number}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Panel 3: Chat Window */}
      <Card className="flex-1 flex flex-col shadow-lg">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            {selectedContact ? (
              <>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">{selectedContact.name?.charAt(0) || 'C'}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedContact.name}</p>
                  <p className="text-sm text-gray-500">{selectedContact.phone_number}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Select a contact to start messaging</p>
            )}
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {!selectedContact ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a contact to view messages</p>
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No messages yet</p>
              <p className="text-sm mt-2">Send a message to start the conversation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          {selectedContact ? (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm">Select a contact to send messages</p>
          )}
        </div>
      </Card>
    </div>
  );
}

