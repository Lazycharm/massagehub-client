import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Phone, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MiniChatroomList({ selectedMiniChatroom, onSelectMiniChatroom }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's mini-chatrooms with stats
  const { data: miniChatrooms = [], isLoading, error } = useQuery({
    queryKey: ['myMiniChatrooms'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch('/api/inbox/my-minichatrooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch mini-chatrooms');
      }
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Filter by search term
  const filteredMiniChatrooms = miniChatrooms.filter(mc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      mc.real_number?.toLowerCase().includes(searchLower) ||
      mc.label?.toLowerCase().includes(searchLower) ||
      mc.chatroom?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">My Lines</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search lines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Mini-Chatroom List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
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
            <Phone className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-gray-500">Failed to load lines</p>
            <p className="text-xs text-gray-400 mt-1">{error.message}</p>
          </div>
        ) : filteredMiniChatrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Phone className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-gray-500">No lines found</p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-1">Try a different search</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMiniChatrooms.map((mc) => {
              const isSelected = selectedMiniChatroom?.id === mc.id;
              const hasUnread = mc.unread_count > 0;

              return (
                <div
                  key={mc.id}
                  onClick={() => onSelectMiniChatroom(mc)}
                  className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <Phone className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {mc.label || mc.real_number}
                        </h3>
                        {hasUnread && (
                          <Badge className="bg-blue-600 text-white text-xs">
                            {mc.unread_count}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {mc.real_number}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {mc.chatroom?.provider || 'Unknown'}
                        </Badge>
                        <span>•</span>
                        <span>{mc.total_clients || 0} clients</span>
                      </div>

                      {mc.last_message_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last: {formatDistanceToNow(new Date(mc.last_message_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <Wifi className="w-3 h-3 text-green-500" />
          <span>Real-time updates active</span>
        </div>
      </div>
    </div>
  );
}
