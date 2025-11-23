import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { MessageSquare, Plus, Edit, Trash2, Users as UsersIcon, Database, CheckCircle, XCircle, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminChatrooms() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChatroom, setEditingChatroom] = useState(null);
  const [assigningUsers, setAssigningUsers] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sender_number: '',
    sender_number_id: null,
    provider: 'twilio',
    provider_account_id: null,
    is_active: true
  });
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const queryClient = useQueryClient();

  const { data: chatrooms = [], isLoading } = useQuery({
    queryKey: ['adminChatrooms'],
    queryFn: async () => {
      const res = await fetch('/api/admin/chatrooms');
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      return res.json();
    }
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    }
  });

  const { data: senderNumbers = [] } = useQuery({
    queryKey: ['senderNumbers'],
    queryFn: async () => {
      const res = await fetch('/api/sender-numbers');
      if (!res.ok) throw new Error('Failed to fetch sender numbers');
      return res.json();
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/admin/chatrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create chatroom');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminChatrooms']);
      resetForm();
      alert('✅ Chatroom created successfully!');
    },
    onError: (error) => {
      alert(`❌ Error creating chatroom: ${error.message}`);
      console.error('Create chatroom error:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/admin/chatrooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update chatroom');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminChatrooms']);
      resetForm();
      alert('✅ Chatroom updated successfully!');
    },
    onError: (error) => {
      alert(`❌ Error updating chatroom: ${error.message}`);
      console.error('Update chatroom error:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, force }) => {
      const url = force 
        ? `/api/admin/chatrooms/${id}?force=true` 
        : `/api/admin/chatrooms/${id}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete chatroom');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['adminChatrooms']);
      alert(`✅ ${data.message}`);
    },
    onError: (error) => {
      alert(`❌ ${error.message}`);
      console.error('Delete chatroom error:', error);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const res = await fetch(`/api/admin/chatrooms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update chatroom');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminChatrooms']);
      alert('✅ Chatroom status updated!');
    },
    onError: (error) => {
      alert(`❌ ${error.message}`);
    }
  });

  const assignUsersMutation = useMutation({
    mutationFn: async ({ chatroomId, userIds }) => {
      const res = await fetch(`/api/admin/chatrooms/${chatroomId}/assign-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds }),
      });
      if (!res.ok) throw new Error('Failed to assign users');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminChatrooms']);
      setAssigningUsers(null);
      setSelectedUserIds([]);
      alert('Users assigned successfully');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingChatroom) {
      updateMutation.mutate({ id: editingChatroom.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (chatroom) => {
    setEditingChatroom(chatroom);
    setFormData({
      name: chatroom.name,
      sender_number: chatroom.sender_number || '',
      sender_number_id: chatroom.sender_number_id || null,
      provider: chatroom.provider || 'twilio',
      provider_account_id: chatroom.provider_account_id,
      is_active: chatroom.is_active
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id, hasMessages = false) => {
    if (hasMessages) {
      const confirmMsg = 'This chatroom has messages. Choose an option:\n\n' +
        'OK - Force delete (removes chatroom and all messages)\n' +
        'Cancel - Keep the chatroom';
      
      if (confirm(confirmMsg)) {
        deleteMutation.mutate({ id, force: true });
      }
    } else {
      if (confirm('Are you sure you want to delete this chatroom?')) {
        deleteMutation.mutate({ id, force: false });
      }
    }
  };

  const handleToggleActive = (id, isActive) => {
    const action = isActive ? 'deactivate (archive)' : 'activate';
    if (confirm(`Are you sure you want to ${action} this chatroom?`)) {
      toggleActiveMutation.mutate({ id, isActive });
    }
  };

  const handleAssignUsers = (chatroom) => {
    setAssigningUsers(chatroom);
    setSelectedUserIds([]);
  };

  const handleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const submitUserAssignment = () => {
    if (selectedUserIds.length === 0) {
      alert('Please select at least one user');
      return;
    }
    assignUsersMutation.mutate({
      chatroomId: assigningUsers.id,
      userIds: selectedUserIds
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sender_number: '',
      sender_number_id: null,
      provider: 'twilio',
      provider_account_id: null,
      is_active: true
    });
    setEditingChatroom(null);
    setIsFormOpen(false);
  };

  // Calculate stats
  const totalMessages = chatrooms.reduce((sum, c) => sum + (c.message_count || 0), 0);
  const activeChatrooms = chatrooms.filter(c => c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Chatroom
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Chatrooms</p>
                <p className="text-2xl font-bold text-gray-900">{chatrooms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeChatrooms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Messages/Room</p>
                <p className="text-2xl font-bold text-gray-900">
                  {chatrooms.length > 0 ? Math.round(totalMessages / chatrooms.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <Card className="shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle>{editingChatroom ? 'Edit Chatroom' : 'Create Chatroom'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Chatroom Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Customer Support"
                    required
                  />
                </div>
                <div>
                  <Label>Sender Number *</Label>
                  <select
                    value={formData.sender_number_id || ''}
                    onChange={(e) => {
                      const selectedNumber = senderNumbers.find(sn => sn.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        sender_number_id: e.target.value || null,
                        sender_number: selectedNumber?.number_or_id || formData.sender_number,
                        provider: selectedNumber?.provider ? selectedNumber.provider.toLowerCase() : formData.provider
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select sender number...</option>
                    {senderNumbers.filter(sn => sn.active).map(sn => (
                      <option key={sn.id} value={sn.id}>
                        {sn.label} ({sn.number_or_id}) - {sn.provider}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select from configured sender numbers</p>
                </div>
                <div>
                  <Label>Provider</Label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="twilio">Twilio</option>
                    <option value="infobip">Infobip</option>
                    <option value="base44">Base44</option>
                    <option value="viber">Viber</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <Label>Provider Account</Label>
                  <select
                    value={formData.provider_account_id || ''}
                    onChange={(e) => setFormData({ ...formData, provider_account_id: e.target.value || null })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {providers.filter(p => p.is_active).map(p => (
                      <option key={p.id} value={p.id}>{p.provider_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">Active Chatroom</Label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingChatroom ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User Assignment Modal */}
      {assigningUsers && (
        <Card className="shadow-xl border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle>Assign Users to {assigningUsers.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.filter(u => u.role !== 'admin').map(user => (
                <label key={user.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => handleUserSelection(user.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{user.name || user.email}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssigningUsers(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitUserAssignment}
                disabled={assignUsersMutation.isPending}
              >
                Assign {selectedUserIds.length} User{selectedUserIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chatrooms Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading chatrooms...
                    </TableCell>
                  </TableRow>
                ) : chatrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No chatrooms found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  chatrooms.map((chatroom) => (
                    <TableRow key={chatroom.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{chatroom.name}</TableCell>
                      <TableCell className="text-sm">{chatroom.sender_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {chatroom.provider || 'twilio'}
                        </Badge>
                      </TableCell>
                      <TableCell>{chatroom.user_count || 0}</TableCell>
                      <TableCell>{chatroom.message_count || 0}</TableCell>
                      <TableCell>
                        {chatroom.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignUsers(chatroom)}
                            className="gap-1"
                            title="Assign users"
                          >
                            <UsersIcon className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(chatroom.id, chatroom.is_active)}
                            className={chatroom.is_active ? 'text-orange-600' : 'text-green-600'}
                            title={chatroom.is_active ? 'Archive (deactivate)' : 'Activate'}
                          >
                            {chatroom.is_active ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(chatroom)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(chatroom.id, chatroom.message_count > 0)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
