import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, User, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ClientList({ selectedMiniChatroom, selectedClient, onSelectClient }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch clients for selected mini-chatroom
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['miniChatroomClients', selectedMiniChatroom?.id],
    queryFn: async () => {
      if (!selectedMiniChatroom) return [];
      
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch(
        `/api/inbox/minichatroom-clients?minichatroom_id=${selectedMiniChatroom.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: !!selectedMiniChatroom,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Filter by search term
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.contact?.name?.toLowerCase().includes(searchLower) ||
      client.contact_number?.toLowerCase().includes(searchLower) ||
      client.contact?.email?.toLowerCase().includes(searchLower)
    );
  });

  if (!selectedMiniChatroom) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 border-r border-gray-200 p-6">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-3" />
        <p className="text-gray-500 text-center">Select a line to view clients</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          {selectedMiniChatroom.label || selectedMiniChatroom.real_number}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {clients.length} {clients.length === 1 ? 'client' : 'clients'}
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Failed to load clients</p>
            <p className="text-xs text-gray-400 mt-1">{error.message}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No clients found</p>
            {searchTerm && (
              <p className="text-xs text-gray-400 mt-1">Try a different search</p>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              const hasUnread = client.unread_count > 0;
              const contactName = client.contact?.name || 'Unknown';

              return (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className={`bg-white rounded-lg p-4 border cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {contactName.charAt(0).toUpperCase()}
                      </div>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                          {client.unread_count}
                        </div>
                      )}
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {contactName}
                        </h4>
                        {client.last_message_at && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatDistanceToNow(new Date(client.last_message_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 truncate mb-2">
                        {client.contact_number}
                      </p>

                      {/* Last Message Preview */}
                      {client.last_message_content && (
                        <p className="text-xs text-gray-500 truncate">
                          {client.last_message_content}
                        </p>
                      )}

                      {/* Status Badge */}
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            client.status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {client.status || 'active'}
                        </Badge>
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
