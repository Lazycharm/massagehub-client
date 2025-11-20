import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Send, MessageSquare, Phone, User, CheckCheck, Check, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function ChatWindowV2({ selectedClient, selectedMiniChatroom }) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages for the selected client
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['clientMessages', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return null;
      
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch(
        `/api/inbox/client-messages?client_assignment_id=${selectedClient.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    enabled: !!selectedClient,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const messages = messagesData?.messages || [];
  const contact = messagesData?.contact;

  // Mark messages as read when client is selected
  useEffect(() => {
    if (selectedClient && selectedClient.unread_count > 0) {
      const markAsRead = async () => {
        try {
          const token = localStorage.getItem('sb-access-token');
          await fetch('/api/inbox/mark-read', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ client_assignment_id: selectedClient.id })
          });
          
          // Refresh mini-chatroom and client lists to update unread counts
          queryClient.invalidateQueries(['myMiniChatrooms']);
          queryClient.invalidateQueries(['miniChatroomClients', selectedMiniChatroom?.id]);
        } catch (error) {
          console.error('Failed to mark as read:', error);
        }
      };
      markAsRead();
    }
  }, [selectedClient, selectedMiniChatroom, queryClient]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedClient) return;

    const channel = supabase
      .channel(`client-chat-${selectedClient.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbound_messages',
          filter: `to_address=eq.${selectedMiniChatroom?.real_number}`
        },
        () => {
          queryClient.invalidateQueries(['clientMessages', selectedClient.id]);
          queryClient.invalidateQueries(['miniChatroomClients', selectedMiniChatroom?.id]);
          queryClient.invalidateQueries(['myMiniChatrooms']);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          queryClient.invalidateQueries(['clientMessages', selectedClient.id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient, selectedMiniChatroom, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedClient || isSending) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch('/api/inbox/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_assignment_id: selectedClient.id,
          message_content: messageText,
          message_type: 'sms'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      setMessageText('');
      queryClient.invalidateQueries(['clientMessages', selectedClient.id]);
      queryClient.invalidateQueries(['miniChatroomClients', selectedMiniChatroom?.id]);
      queryClient.invalidateQueries(['myMiniChatrooms']);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'delivered' || status === 'read' || status === 'sent') {
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    }
    if (status === 'pending') {
      return <Check className="w-3 h-3 text-gray-400" />;
    }
    if (status === 'failed') {
      return <span className="text-xs text-red-500">✗</span>;
    }
    return <Check className="w-3 h-3 text-gray-400" />;
  };

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white p-6">
        <MessageSquare className="w-20 h-20 text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Select a client to view conversation</p>
        <p className="text-gray-400 text-sm mt-2">Choose from the list on the left</p>
      </div>
    );
  }

  const contactName = contact?.name || selectedClient.contact?.name || 'Unknown';
  const contactPhone = selectedClient.contact_number;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {contactName.charAt(0).toUpperCase()}
          </div>

          {/* Contact Info */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{contactName}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-3 h-3" />
              <span>{contactPhone}</span>
              {contact?.email && (
                <>
                  <span>•</span>
                  <span>{contact.email}</span>
                </>
              )}
            </div>
          </div>

          {/* Line Badge */}
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Via: {selectedMiniChatroom?.real_number}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation below</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOutbound = message.direction === 'outbound';
            const showTimestamp = index === 0 || 
              (new Date(message.timestamp) - new Date(messages[index - 1].timestamp)) > 3600000; // 1 hour

            return (
              <div key={message.id || index}>
                {/* Timestamp Divider */}
                {showTimestamp && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {format(new Date(message.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isOutbound ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOutbound
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    
                    {/* Message Meta */}
                    <div className={`flex items-center gap-2 mt-1 px-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </span>
                      {isOutbound && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                          <span className="text-xs text-gray-500 capitalize">
                            {message.status || 'sent'}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {message.message_type?.toUpperCase() || 'SMS'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send)"
            className="flex-1 min-h-[60px] max-h-[150px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={sendMessage}
            disabled={!messageText.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sending via {selectedMiniChatroom?.chatroom?.provider || 'Unknown'} provider
        </p>
      </div>
    </div>
  );
}
