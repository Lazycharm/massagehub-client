import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, User, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ContactSidebar({ selectedContact, onSelectContact }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [presenceData, setPresenceData] = useState({});

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch last message for each contact
  const { data: lastMessages = [] } = useQuery({
    queryKey: ['lastMessages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbound_messages')
        .select('from_address, content, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Get unique last message per contact
      const uniqueMessages = {};
      data?.forEach(msg => {
        if (!uniqueMessages[msg.from_address]) {
          uniqueMessages[msg.from_address] = msg;
        }
      });
      return Object.values(uniqueMessages);
    }
  });

  // Real-time presence tracking (Supabase Presence)
  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user_id',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presence = {};
        Object.keys(state).forEach(key => {
          presence[key] = true;
        });
        setPresenceData(presence);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter contacts by search term
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(searchLower) ||
      contact.last_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.phone_number?.toLowerCase().includes(searchLower)
    );
  });

  const getLastMessage = (contact) => {
    return lastMessages.find(
      msg => msg.from_address === contact.phone_number || msg.from_address === contact.email
    );
  };

  const isOnline = (contactId) => {
    return presenceData[contactId] || false;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Contacts</h2>
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

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <User className="w-16 h-16 text-gray-300 mb-3" />
            <p className="text-gray-500">No contacts found</p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-1">Try a different search</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContacts.map((contact) => {
              const lastMsg = getLastMessage(contact);
              const online = isOnline(contact.id);
              const isSelected = selectedContact?.id === contact.id;
              const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';

              return (
                <div
                  key={contact.id}
                  onClick={() => onSelectContact(contact)}
                  className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with online indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                      {online ? (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      ) : (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white rounded-full" />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {fullName}
                        </h3>
                        {lastMsg && (
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 truncate mb-1">
                        {contact.phone_number || contact.email}
                      </p>

                      {lastMsg && (
                        <p className="text-xs text-gray-500 truncate">
                          {lastMsg.content}
                        </p>
                      )}

                      {!lastMsg && (
                        <p className="text-xs text-gray-400 italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Connection Status */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <Wifi className="w-3 h-3 text-green-500" />
          <span>Real-time updates active</span>
        </div>
      </div>
    </div>
  );
}
