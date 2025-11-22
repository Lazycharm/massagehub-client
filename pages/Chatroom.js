import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Search, MessageSquare, Send, Phone, UserPlus, Loader2, Star, Trash2, MoreVertical, CheckSquare, Square } from 'lucide-react';
import ResourcePickerModal from '../components/inbox/ResourcePickerModal';

/**
 * Chatroom Page - Single Chatroom View
 * Shows one chatroom at a time with a dropdown to switch between assigned chatrooms
 * Left: Contacts in current chatroom + Add Contact button
 * Right: Chat window with selected contact
 */
export default function Chatroom() {
  const [selectedChatroomId, setSelectedChatroomId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const queryClient = useQueryClient();

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

  // Auto-select first chatroom on load
  useEffect(() => {
    if (!selectedChatroomId && chatrooms.length > 0) {
      setSelectedChatroomId(chatrooms[0].chatroom_id);
    }
  }, [chatrooms, selectedChatroomId]);

  const selectedChatroom = chatrooms.find(cr => cr.chatroom_id === selectedChatroomId);

  // Fetch contacts for selected chatroom
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['chatroomContacts', selectedChatroomId],
    queryFn: async () => {
      if (!selectedChatroomId) return [];
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/chatrooms/${selectedChatroomId}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    enabled: !!selectedChatroomId,
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
  // Only show manually added contacts (not imported from resources)
  const filteredContacts = contacts
    .filter(contact => contact.added_via === 'manual') // Only show manually added contacts
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
    if (!messageInput.trim() || !selectedContact || !selectedChatroomId) return;

    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatroom_id: selectedChatroomId,
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
      setSelectedContact(newContact);
    }
  };

  const handleChatroomChange = (chatroomId) => {
    setSelectedChatroomId(chatroomId);
    setSelectedContact(null);
    setSearchTerm('');
    setSelectionMode(false);
    setSelectedContacts([]);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedContacts([]);
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleBulkFavorite = async (isFavorite) => {
    if (selectedContacts.length === 0) return;

    try {
      const token = localStorage.getItem('sb-access-token');
      
      await Promise.all(
        selectedContacts.map(contactId =>
          fetch(`/api/contacts/${contactId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ is_favorite: isFavorite }),
          })
        )
      );

      queryClient.invalidateQueries(['chatroomContacts', selectedChatroomId]);
      setSelectedContacts([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk favorite error:', error);
      alert(`Failed to update favorites: ${error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contact(s)?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sb-access-token');
      
      await Promise.all(
        selectedContacts.map(contactId =>
          fetch(`/api/contacts/${contactId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      if (selectedContact && selectedContacts.includes(selectedContact.id)) {
        setSelectedContact(null);
      }

      queryClient.invalidateQueries(['chatroomContacts', selectedChatroomId]);
      setSelectedContacts([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert(`Failed to delete contacts: ${error.message}`);
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
      queryClient.invalidateQueries(['chatroomContacts', selectedChatroomId]);
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
      queryClient.invalidateQueries(['chatroomContacts', selectedChatroomId]);
    } catch (error) {
      console.error('Delete contact error:', error);
      alert(`Failed to delete contact: ${error.message}`);
    } finally {
      setOpenMenuId(null);
    }
  };

  return (
      <div className="space-y-4 p-6">
        {/* Chatroom Selector */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Current Chatroom:
            </label>
            {loadingChatrooms ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading chatrooms...
              </div>
            ) : chatrooms.length === 0 ? (
              <p className="text-sm text-gray-500">No chatrooms assigned. Contact your admin.</p>
            ) : (
              <select
                value={selectedChatroomId || ''}
                onChange={(e) => handleChatroomChange(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {chatrooms.map((cr) => (
                  <option key={cr.chatroom_id} value={cr.chatroom_id}>
                    {cr.chatroom?.name || 'Unnamed'} - {cr.chatroom?.provider} ({cr.contact_count || 0} contacts)
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedChatroom && (
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span>Provider: <strong>{selectedChatroom.chatroom?.provider}</strong></span>
              <span>Number: <strong>{selectedChatroom.chatroom?.sender_number?.phone_number || 'N/A'}</strong></span>
              <Badge variant="secondary">{selectedChatroom.contact_count || 0} contacts</Badge>
            </div>
          )}
        </Card>

        {/* Main Content */}
        <div className="flex gap-4 h-[calc(100vh-16rem)]">
          {/* Left Panel: Contacts */}
          <Card className="w-80 flex flex-col shadow-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
                <div className="flex items-center gap-2">
                  {selectedChatroomId && contacts.length > 0 && (
                    <Button
                      size="sm"
                      variant={selectionMode ? "default" : "outline"}
                      onClick={toggleSelectionMode}
                      className="gap-1"
                    >
                      {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      Select
                    </Button>
                  )}
                  {selectedChatroomId && (
                    <Button
                      size="sm"
                      onClick={() => setShowResourcePicker(true)}
                      className="gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Bulk Actions Bar */}
              {selectionMode && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      {selectedContacts.length === filteredContacts.length ? (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4" />
                          Select All
                        </>
                      )}
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedContacts.length} selected
                    </span>
                  </div>
                  
                  {selectedContacts.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkFavorite(true)}
                        className="flex-1 gap-1 text-xs"
                      >
                        <Star className="w-3 h-3" />
                        Favorite
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkFavorite(false)}
                        className="flex-1 gap-1 text-xs"
                      >
                        <Star className="w-3 h-3" />
                        Unfavorite
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkDelete}
                        className="flex-1 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {!selectedChatroomId ? (
                <div className="p-8 text-center text-gray-500">
                  Select a chatroom above
                </div>
              ) : loadingContacts ? (
                <div className="p-4 text-center text-gray-500">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="p-8 text-center">
                  <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">No contacts yet</p>
                  <Button
                    onClick={() => setShowResourcePicker(true)}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Your First Contact
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b bg-gray-50">
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
                  </div>
                  <div className="divide-y">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`p-4 hover:bg-gray-50 transition-colors relative ${
                          selectedContact?.id === contact.id && !selectionMode ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        } ${
                          selectionMode && selectedContacts.includes(contact.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            if (selectionMode) {
                              toggleContactSelection(contact.id);
                            } else {
                              setSelectedContact(contact);
                            }
                          }}
                        >
                          {/* Checkbox in selection mode */}
                          {selectionMode && (
                            <div className="flex-shrink-0">
                              {selectedContacts.includes(contact.id) ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          )}
                          
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 relative">
                            <span className="text-white font-semibold">
                              {contact.name?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                            {contact.is_favorite && (
                              <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                                <Star className="w-3 h-3 text-white fill-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                              {contact.is_favorite && (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{contact.phone_number}</p>
                          </div>
                          
                          {/* Action Menu - only show when not in selection mode */}
                          {!selectionMode && (
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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

        {/* Resource Picker Modal */}
        <ResourcePickerModal
          isOpen={showResourcePicker}
          onClose={handleResourcePickerClose}
          chatroomId={selectedChatroomId}
        />
      </div>
  );
}
