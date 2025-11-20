// src/MessageHub/components/chatrooms/ChatRoomSidebar.jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/MessageHub/lib/supabaseClient';

export default function ChatRoomSidebar({ onSelectChatroom }) {
  const [chatrooms, setChatrooms] = useState([]);

  useEffect(() => {
    const fetchChatrooms = async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setChatrooms(data);
    };
    fetchChatrooms();
  }, []);

  return (
    <div className="space-y-2">
      {chatrooms.map((room) => (
        <button
          key={room.id}
          onClick={() => onSelectChatroom(room)}
          className="w-full text-left p-2 bg-white hover:bg-gray-100 rounded"
        >
          {room.name} <span className="text-sm text-gray-400">{room.sender_number}</span>
        </button>
      ))}
    </div>
  );
}
