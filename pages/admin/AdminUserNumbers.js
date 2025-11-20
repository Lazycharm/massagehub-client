import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Phone, Plus, Edit, Trash2, Upload, Download, Users, MessageSquare, Filter } from 'lucide-react';

export default function AdminUserNumbers() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState(null);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [formData, setFormData] = useState({
    user_id: '',
    real_number: '',
    provider: 'sms',
    label: '',
    assigned_chatroom_id: null,
    daily_message_limit: 500
  });

  const queryClient = useQueryClient();

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ['userRealNumbers'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-real-numbers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch user real numbers');
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

  const { data: chatrooms = [] } = useQuery({
    queryKey: ['adminChatrooms'],
    queryFn: async () => {
      const res = await fetch('/api/admin/chatrooms');
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('[Create] Starting with data:', data);
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-real-numbers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      console.log('[Create] Response status:', res.status);
      if (!res.ok) {
        const error = await res.json();
        console.error('[Create] Error response:', error);
        throw new Error(error.error || 'Failed to create user real number');
      }
      const result = await res.json();
      console.log('[Create] Success result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[Create] onSuccess triggered with:', data);
      queryClient.invalidateQueries(['userRealNumbers']);
      queryClient.refetchQueries(['userRealNumbers']); // Force refetch
      resetForm();
      alert('✅ Mini-chatroom created successfully!');
    },
    onError: (error) => {
      console.error('[Create] onError triggered:', error);
      alert(`❌ Error creating mini-chatroom: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/user-real-numbers/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update user real number');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userRealNumbers']);
      resetForm();
      alert('✅ Mini-chatroom updated successfully!');
    },
    onError: (error) => {
      alert(`❌ Error updating mini-chatroom: ${error.message}`);
      console.error('Update error:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/user-real-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete user real number');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userRealNumbers']);
      alert('✅ Mini-chatroom deleted successfully!');
    },
    onError: (error) => {
      alert(`❌ Error deleting mini-chatroom: ${error.message}`);
      console.error('Delete error:', error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingNumber) {
      updateMutation.mutate({ id: editingNumber.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (number) => {
    setEditingNumber(number);
    setFormData({
      user_id: number.user_id,
      real_number: number.real_number,
      provider: number.provider,
      label: number.label,
      assigned_chatroom_id: number.assigned_chatroom_id,
      daily_message_limit: number.daily_message_limit
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this mini-chatroom?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/user-real-numbers/bulk-import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      alert(`Imported ${result.imported} mini-chatrooms${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}`);
      queryClient.invalidateQueries(['userRealNumbers']);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleExport = () => {
    const csv = [
      ['User', 'Real Number', 'Provider', 'Label', 'Chatroom', 'Clients', 'Messages Sent', 'Daily Limit', 'Active'].join(','),
      ...numbers.map(n => [
        n.user?.email || '',
        n.real_number,
        n.provider,
        n.label,
        n.chatroom?.name || '',
        n.client_count || 0,
        n.messages_sent_today || 0,
        n.daily_message_limit,
        n.is_active ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-real-numbers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      real_number: '',
      provider: 'sms',
      label: '',
      assigned_chatroom_id: null,
      daily_message_limit: 500
    });
    setEditingNumber(null);
    setIsFormOpen(false);
  };

  // Filter numbers
  const filteredNumbers = numbers.filter(number => {
    const matchesSearch = searchTerm === '' || 
      number.real_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      number.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      number.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvider = providerFilter === 'all' || number.provider === providerFilter;
    
    return matchesSearch && matchesProvider;
  });

  const totalClients = numbers.reduce((sum, n) => sum + (n.client_count || 0), 0);
  const activeNumbers = numbers.filter(n => n.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Real Numbers (Mini-Chatrooms)</h1>
          <p className="text-gray-500 mt-1">Manage user's actual phone numbers and messaging identities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <label>
            <Button variant="outline" disabled={importing} className="gap-2" as="span">
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleBulkImport}
              className="hidden"
              disabled={importing}
            />
          </label>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Number
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Mini-Chatrooms</p>
                <p className="text-2xl font-bold text-gray-900">{numbers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeNumbers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(numbers.map(n => n.user_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by number, label, or user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Providers</option>
                <option value="sms">SMS</option>
                <option value="infobip">Infobip</option>
                <option value="viber">Viber</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
          {(searchTerm || providerFilter !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredNumbers.length} of {numbers.length} mini-chatrooms
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {isFormOpen && (
        <Card className="shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle>{editingNumber ? 'Edit Mini-Chatroom' : 'Create Mini-Chatroom'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>User *</Label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!editingNumber}
                  >
                    <option value="">Select User</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Real Number / ID *</Label>
                  <Input
                    value={formData.real_number}
                    onChange={(e) => setFormData({ ...formData, real_number: e.target.value })}
                    placeholder="+1234567890"
                    required
                  />
                </div>
                <div>
                  <Label>Provider *</Label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="sms">SMS</option>
                    <option value="infobip">Infobip</option>
                    <option value="viber">Viber</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <Label>Label</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="My Business Line"
                  />
                </div>
                <div>
                  <Label>Assigned Chatroom</Label>
                  <select
                    value={formData.assigned_chatroom_id || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_chatroom_id: e.target.value || null })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {chatrooms.filter(c => c.is_active).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Daily Message Limit</Label>
                  <Input
                    type="number"
                    value={formData.daily_message_limit}
                    onChange={(e) => setFormData({ ...formData, daily_message_limit: parseInt(e.target.value) || 500 })}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingNumber ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>User</TableHead>
                  <TableHead>Real Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Chatroom</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Sent Today</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      {numbers.length === 0 ? 'No mini-chatrooms configured' : 'No mini-chatrooms match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNumbers.map((number) => (
                    <TableRow key={number.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{number.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{number.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{number.real_number}</TableCell>
                      <TableCell>{number.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{number.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{number.chatroom?.name || '-'}</TableCell>
                      <TableCell>{number.client_count || 0}</TableCell>
                      <TableCell>
                        <span className={number.messages_sent_today >= number.daily_message_limit ? 'text-red-600 font-semibold' : ''}>
                          {number.messages_sent_today || 0} / {number.daily_message_limit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {number.is_active ? (
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
                            onClick={() => handleEdit(number)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(number.id)}
                            className="text-red-600 hover:text-red-700"
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
