import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { UserPlus, Trash2, Shield, MessageSquare, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

export default function AdminChatroomAccess() {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedChatroom, setSelectedChatroom] = useState('');
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/users', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  // Fetch all chatrooms
  const { data: chatrooms = [] } = useQuery({
    queryKey: ['chatrooms'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/chatrooms', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      return res.json();
    },
  });

  // Fetch assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['userChatroomAssignments'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-chatrooms', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) throw new Error('Failed to fetch assignments');
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ user_id, chatroom_id }) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-chatrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ user_id, chatroom_id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userChatroomAssignments']);
      setSelectedUser('');
      setSelectedChatroom('');
      setResult({ success: true, message: 'User assigned successfully!' });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 5000);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ user_id, chatroom_id }) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-chatrooms', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ user_id, chatroom_id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove assignment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userChatroomAssignments']);
      setResult({ success: true, message: 'Assignment removed!' });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 5000);
    },
  });

  const handleAssign = () => {
    if (!selectedUser || !selectedChatroom) {
      setResult({ success: false, message: 'Please select both user and chatroom' });
      setTimeout(() => setResult(null), 3000);
      return;
    }
    assignMutation.mutate({ user_id: selectedUser, chatroom_id: selectedChatroom });
  };

  const handleRemove = (userId, chatroomId) => {
    if (confirm('Remove this user from the chatroom?')) {
      removeMutation.mutate({ user_id: userId, chatroom_id: chatroomId });
    }
  };

  // Group assignments by chatroom
  const assignmentsByChatroom = chatrooms.map(chatroom => {
    const chatroomAssignments = assignments.filter(a => a.chatroom_id === chatroom.id);
    return {
      chatroom,
      users: chatroomAssignments.map(a => a.users).filter(Boolean)
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries(['userChatroomAssignments'])}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Assign User to Chatroom */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Assign User to Chatroom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'admin').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedChatroom} onValueChange={setSelectedChatroom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chatroom..." />
                </SelectTrigger>
                <SelectContent>
                  {chatrooms.map(chatroom => (
                    <SelectItem key={chatroom.id} value={chatroom.id}>
                      {chatroom.name} ({chatroom.sender_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAssign}
              disabled={assignMutation.isPending || !selectedUser || !selectedChatroom}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments by Chatroom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assignmentsByChatroom.map(({ chatroom, users: assignedUsers }) => (
          <Card key={chatroom.id} className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    {chatroom.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{chatroom.sender_number}</p>
                </div>
                <Badge>{assignedUsers.length} users</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {assignedUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No users assigned</p>
              ) : (
                <div className="space-y-2">
                  {assignedUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(user.id, chatroom.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      )}
    </div>
  );
}

