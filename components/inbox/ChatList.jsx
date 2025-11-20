import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Badge } from '../ui/badge';
import { MessageSquare, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatList({ selectedContact, selectedChat, onSelectChat }) {
  // Fetch chat threads for the selected contact
  const { data: chatThreads = [], isLoading } = useQuery({
    queryKey: ['chatThreads', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];

      const { data, error } = await supabase
        .from('inbound_messages')
        .select('*')
        .or(`from_address.eq.${selectedContact.phone_number},from_address.eq.${selectedContact.email}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedContact
  });

  if (!selectedContact) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 border-r border-gray-200 p-6">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-3" />
        <p className="text-gray-500 text-center">Select a contact to view conversations</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    if (status === 'delivered' || status === 'read') {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    }
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Conversations with {selectedContact.first_name || selectedContact.last_name || 'Contact'}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {chatThreads.length} {chatThreads.length === 1 ? 'message' : 'messages'}
        </p>
      </div>

      {/* Chat Thread List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : chatThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a conversation</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {chatThreads.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const fullName = `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim() || 'Contact';

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={`bg-white rounded-lg p-4 border cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* Message Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {fullName}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Message Preview */}
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {chat.content}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            chat.type === 'sms' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {chat.type?.toUpperCase()}
                        </Badge>

                        {/* Status Indicator */}
                        <div className="flex items-center gap-1">
                          {getStatusIcon(chat.status)}
                          <span className="text-xs text-gray-500 capitalize">
                            {chat.status || 'sent'}
                          </span>
                        </div>

                        {/* Unread Indicator */}
                        {!chat.read && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
