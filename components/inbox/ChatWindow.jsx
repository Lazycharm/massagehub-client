import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Send, MessageSquare, Phone, Mail, MoreVertical, CheckCheck, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatWindow({ selectedContact, selectedChat }) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('sb-access-token');
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch all messages for the selected contact
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];

      // Fetch inbound messages
      const { data: inbound, error: inboundError } = await supabase
        .from('inbound_messages')
        .select('*')
        .or(`from_address.eq.${selectedContact.phone_number},from_address.eq.${selectedContact.email}`)
        .order('created_at', { ascending: true });

      if (inboundError) throw inboundError;

      // Fetch outbound messages (from messages table)
      const { data: outbound, error: outboundError } = await supabase
        .from('messages')
        .select('*')
        .or(`phone_number.eq.${selectedContact.phone_number},email.eq.${selectedContact.email}`)
        .order('created_at', { ascending: true });

      if (outboundError) throw outboundError;

      // Combine and sort by timestamp
      const combined = [
        ...(inbound || []).map(m => ({ ...m, direction: 'inbound' })),
        ...(outbound || []).map(m => ({ ...m, direction: 'outbound' }))
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return combined;
    },
    enabled: !!selectedContact
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedContact) return;

    const channel = supabase
      .channel(`chat-${selectedContact.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbound_messages',
          filter: `from_address=in.(${selectedContact.phone_number},${selectedContact.email})`
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries(['chatMessages', selectedContact.id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries(['chatMessages', selectedContact.id]);
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedContact) return;

    const messageData = {
      content: messageText,
      type: selectedContact.phone_number ? 'sms' : 'email',
      ...(selectedContact.phone_number 
        ? { phone_number: selectedContact.phone_number }
        : { email: selectedContact.email, subject: 'New message' }
      )
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedContact) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white p-6">
        <MessageSquare className="w-24 h-24 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No chat selected</h3>
        <p className="text-gray-500 text-center">
          Select a contact from the list to start chatting
        </p>
      </div>
    );
  }

  const fullName = `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim() || 'Contact';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{fullName}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {selectedContact.phone_number && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedContact.phone_number}
                  </span>
                )}
                {selectedContact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedContact.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isInbound = message.direction === 'inbound';
              const showTimestamp = index === 0 || 
                (new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime()) > 300000; // 5 minutes

              return (
                <div key={message.id}>
                  {/* Timestamp separator */}
                  {showTimestamp && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] ${isInbound ? 'order-1' : 'order-2'}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isInbound
                            ? 'bg-gray-200 text-gray-900 rounded-tl-sm'
                            : 'bg-blue-600 text-white rounded-tr-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>

                      {/* Message metadata */}
                      <div className={`flex items-center gap-1 mt-1 px-2 text-xs text-gray-500 ${
                        isInbound ? 'justify-start' : 'justify-end'
                      }`}>
                        <span>{format(new Date(message.created_at), 'h:mm a')}</span>
                        {!isInbound && (
                          <>
                            {message.status === 'delivered' || message.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{fullName} is typing...</span>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-end gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={2}
            className="flex-1 resize-none"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 h-[72px]"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        {sendMessageMutation.isPending && (
          <p className="text-xs text-gray-500 mt-2">Sending...</p>
        )}
        {sendMessageMutation.isError && (
          <p className="text-xs text-red-500 mt-2">Failed to send message. Please try again.</p>
        )}
      </div>
    </div>
  );
}
