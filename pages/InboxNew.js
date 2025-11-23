import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { MessageSquare, Phone, Search, Send } from 'lucide-react';

export default function InboxSimplified() {
  const [selectedChatroom, setSelectedChatroom] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
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
      // Messages will auto-refresh via refetchInterval
    } catch (error) {
      console.error('Send message error:', error);
      alert(`Failed to send message: ${error.message}`);
    }
  };

  return (
      <div className="h-[calc(100vh-4rem)] flex gap-4">
        {/* Left Panel: Chatrooms */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">My Chatrooms</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loadingChatrooms ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : chatrooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No chatrooms assigned. Contact your admin.
              </div>
            ) : (
              <div className="space-y-1">
                {chatrooms.map(assignment => (
                  <button
                    key={assignment.chatroom_id}
                    onClick={() => {
                      setSelectedChatroom(assignment);
                      setSelectedContact(null);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                      selectedChatroom?.chatroom_id === assignment.chatroom_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {assignment.chatroom?.name || 'Unnamed Chatroom'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {assignment.contact_count || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="h-3 w-3" />
                      <span>{assignment.chatroom?.sender_number?.phone_number || 'No number'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {assignment.chatroom?.provider || 'Unknown'} • {assignment.unread_count || 0} unread
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle Panel: Contacts */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {selectedChatroom ? `${selectedChatroom.chatroom?.name} Contacts` : 'Select a Chatroom'}
            </CardTitle>
            {selectedChatroom && (
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {!selectedChatroom ? (
              <div className="p-4 text-center text-gray-500">
                Select a chatroom to view contacts
              </div>
            ) : loadingContacts ? (
              <div className="p-4 text-center text-gray-500">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No contacts yet. Import resources from the Resources page.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                      selectedContact?.id === contact.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{contact.name || 'Unknown'}</span>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">{contact.phone_number}</div>
                    {contact.email && (
                      <div className="text-xs text-gray-400 mt-1">{contact.email}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Chat Window */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3 border-b">
            {selectedContact ? (
              <div>
                <CardTitle className="text-lg">{selectedContact.name || 'Unknown'}</CardTitle>
                <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Phone className="h-3 w-3" />
                  {selectedContact.phone_number}
                  <Badge variant="secondary" className="ml-auto">
                    via {selectedChatroom?.chatroom?.provider || 'Unknown'}
                  </Badge>
                </div>
              </div>
            ) : (
              <CardTitle className="text-lg text-gray-400">
                Select a contact to view conversation
              </CardTitle>
            )}
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4">
            {!selectedContact ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Choose a contact to view the conversation</p>
                </div>
              </div>
            ) : loadingMessages ? (
              <div className="text-center text-gray-500">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-lg ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p>{msg.message_content || msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Message Input */}
          {selectedContact && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Sending via {selectedChatroom?.chatroom?.provider} from{' '}
                {selectedChatroom?.chatroom?.sender_number?.phone_number}
              </p>
            </div>
          )}
        </Card>
      </div>
  );
}
