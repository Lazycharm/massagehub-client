import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Plus, Phone, Mail, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, Upload, Download, Database, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import SenderNumberForm from '../../components/admin/SenderNumberForm';

export default function AdminSenderNumbers() {
  const [showForm, setShowForm] = useState(false);
  const [editingNumber, setEditingNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const { data: senderNumbers = [], isLoading } = useQuery({
    queryKey: ['senderNumbers'],
    queryFn: api.senderNumbers.list
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: api.senderNumbers.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['senderNumbers']);
      setShowForm(false);
      setEditingNumber(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.senderNumbers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['senderNumbers']);
      setShowForm(false);
      setEditingNumber(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.senderNumbers.delete,
    onSuccess: () => queryClient.invalidateQueries(['senderNumbers'])
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => api.senderNumbers.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries(['senderNumbers'])
  });

  const handleSubmit = (data) => {
    if (editingNumber) {
      updateMutation.mutate({ id: editingNumber.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (number) => {
    setEditingNumber(number);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this sender number?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id, currentActive) => {
    toggleActiveMutation.mutate({ id, active: !currentActive });
  };

  const handleSyncFromProvider = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sender-numbers/sync-from-providers', {
        method: 'POST',
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || result.message || 'Sync failed');
      }
      
      // Show detailed results
      const successMsg = `✅ Synced ${result.synced || 0} numbers from providers\n\n`;
      const details = result.results?.map(r => 
        r.error 
          ? `❌ ${r.provider}: ${r.error}` 
          : `✅ ${r.provider}: ${r.synced} numbers`
      ).join('\n') || '';
      
      alert(successMsg + details);
      queryClient.invalidateQueries(['senderNumbers']);
    } catch (error) {
      alert(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/sender-numbers/bulk-import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Import failed');
      const result = await res.json();
      alert(`Imported ${result.imported || 0} sender numbers`);
      queryClient.invalidateQueries(['senderNumbers']);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleExport = () => {
    const csv = [
      ['Label', 'Number/ID', 'Type', 'Provider', 'Region', 'Active', 'Messages'].join(','),
      ...senderNumbers.map(n => [
        n.label,
        n.number_or_id,
        n.type,
        n.provider || '',
        n.region || '',
        n.active ? 'Yes' : 'No',
        n.message_count || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sender-numbers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter sender numbers
  const filteredNumbers = senderNumbers.filter(number => {
    const matchesSearch = searchTerm === '' || 
      number.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      number.number_or_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || number.type === typeFilter;
    const matchesProvider = providerFilter === 'all' || number.provider === providerFilter;
    
    return matchesSearch && matchesType && matchesProvider;
  });

  const getTypeIcon = (type) => {
    if (type === 'email') return <Mail className="w-4 h-4" />;
    return <Phone className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2 mb-6">
          <Button
            variant="outline"
            onClick={handleSyncFromProvider}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Providers'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <label>
            <Button
              variant="outline"
              disabled={importing}
              className="gap-2"
              as="span"
            >
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
          <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
            <Plus className="w-4 h-4" />
            Add Number
          </Button>
        </div>

      {/* Search and Filters */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by label or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Providers</option>
                {providers.map(p => (
                  <option key={p.id} value={p.provider_name}>{p.provider_name}</option>
                ))}
              </select>
            </div>
          </div>
          {(searchTerm || typeFilter !== 'all' || providerFilter !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredNumbers.length} of {senderNumbers.length} numbers
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Numbers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{senderNumbers.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {senderNumbers.filter(n => n.active).length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Messages</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {senderNumbers.reduce((sum, n) => sum + (n.message_count || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Label</TableHead>
                  <TableHead>Number/ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {senderNumbers.length === 0 ? 'No sender numbers configured' : 'No numbers match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNumbers.map((number) => (
                    <TableRow key={number.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{number.label}</TableCell>
                      <TableCell>{number.number_or_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getTypeIcon(number.type)}
                          {number.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50">
                          {number.provider || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{number.region || '-'}</TableCell>
                      <TableCell>{number.message_count || 0}</TableCell>
                      <TableCell>
                        <Badge className={number.active ? 'bg-green-500' : 'bg-gray-400'}>
                          {number.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(number.id, number.active)}
                          >
                            {number.active ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(number)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(number.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

      {showForm && (
        <SenderNumberForm
          senderNumber={editingNumber}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingNumber(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

