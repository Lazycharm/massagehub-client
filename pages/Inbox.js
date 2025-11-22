import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Search, MessageSquare, Send, Phone, UserPlus, Star, Trash2, MoreVertical } from 'lucide-react';
import ResourcePickerModal from '../components/inbox/ResourcePickerModal';

/**
 * Inbox - Phone-Style 2-Panel Layout
 * Left: All contacts from imported resources (like phone contacts)
 * Right: Chat window with selected contact
 */
export default function Inbox() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all user's contacts from all chatrooms
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['myContacts'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/contacts/my-contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    refetchInterval: 30000,
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

  // Filter and sort contacts by search and favorite status
  const filteredContacts = contacts
    .filter(contact =>
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone_number?.includes(searchTerm)
    )
    .sort((a, b) => {
      // Favorites first
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      // Then alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact) return;

    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatroom_id: selectedContact.chatroom_id,
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

  const handleResourcePickerClose = (newContact) => {
    setShowResourcePicker(false);
    if (newContact) {
      // Auto-select the newly added contact
      setSelectedContact(newContact);
    }
  };

  const handleToggleFavorite = async (contact, event) => {
    event.stopPropagation();
    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_favorite: !contact.is_favorite,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update favorite status');
      }

      // Refresh contacts list
      queryClient.invalidateQueries(['myContacts']);
    } catch (error) {
      console.error('Toggle favorite error:', error);
      alert(`Failed to update favorite: ${error.message}`);
    }
  };

  const handleDeleteContact = async (contact, event) => {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete ${contact.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete contact');
      }

      // If the deleted contact was selected, clear selection
      if (selectedContact?.id === contact.id) {
        setSelectedContact(null);
      }

      // Refresh contacts list
      queryClient.invalidateQueries(['myContacts']);
    } catch (error) {
      console.error('Delete contact error:', error);
      alert(`Failed to delete contact: ${error.message}`);
    } finally {
      setOpenMenuId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-4">
      {/* Left Panel: All Contacts (Phone-style) */}
      <Card className="w-96 flex flex-col shadow-lg">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowResourcePicker(true)}
              className="gap-1 bg-white text-blue-600 hover:bg-gray-100"
            >
              <UserPlus className="w-4 h-4" />
              New Chat
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="p-4 text-center text-gray-500">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">No contacts yet</p>
              <p className="text-xs text-gray-400 mb-4">Add contacts from your resources to start messaging</p>
              <Button
                onClick={() => setShowResourcePicker(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Your First Contact
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 hover:bg-gray-50 transition-colors relative ${
                    selectedContact?.id === contact.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 relative">
                      <span className="text-white font-semibold text-lg">
                        {contact.name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                      {contact.is_favorite && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                          {contact.is_favorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {contact.chatroom?.provider && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {contact.chatroom.provider}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{contact.phone_number}</p>
                      {contact.chatroom?.name && (
                        <p className="text-xs text-gray-400 truncate mt-1">
                          via {contact.chatroom.name}
                        </p>
                      )}
                    </div>
                    
                    {/* Action Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === contact.id ? null : contact.id);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      
                      {openMenuId === contact.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-10 z-20 bg-white border rounded-lg shadow-lg py-1 w-48">
                            <button
                              onClick={(e) => handleToggleFavorite(contact, e)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                              <Star className={`w-4 h-4 ${contact.is_favorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`} />
                              {contact.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                            <button
                              onClick={(e) => handleDeleteContact(contact, e)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Contact
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      {/* Right Panel: Chat Window */}
      <Card className="flex-1 flex flex-col shadow-lg">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            {selectedContact ? (
              <>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">{selectedContact.name?.charAt(0) || 'C'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{selectedContact.name}</p>
                  <p className="text-sm text-gray-500">{selectedContact.phone_number}</p>
                </div>
                {selectedContact.chatroom && (
                  <Badge variant="outline" className="text-xs">
                    {selectedContact.chatroom.provider}
                  </Badge>
                )}
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

      {/* Resource Picker Modal */}
      <ResourcePickerModal
        isOpen={showResourcePicker}
        onClose={handleResourcePickerClose}
      />
    </div>
  );
}


