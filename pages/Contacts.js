import React, { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, Upload, Download, Trash2, Edit } from 'lucide-react';
import ContactForm from '../components/contacts/ContactForm';
import ContactsTable from '../components/contacts/ContactsTable';
import BulkImport from '../components/contacts/BulkImport';
import { Badge } from '../components/ui/badge';

export default function Contacts() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.contacts.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.contacts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setShowForm(false);
      setEditingContact(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.contacts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setShowForm(false);
      setEditingContact(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.contacts.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['contacts'])
  });

  const handleSubmit = (data) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone_number?.includes(searchTerm)
  );

  const exportContacts = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Country Code', 'Status'],
      ...contacts.map(c => [c.name, c.email, c.phone_number, c.country_code, c.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2 mb-6">
          <Button variant="outline" onClick={exportContacts}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Contacts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{contacts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {contacts.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Unsubscribed</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {contacts.filter(c => c.status === 'unsubscribed').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search contacts by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <ContactsTable
        contacts={filteredContacts}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Forms */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingContact(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {showImport && (
        <BulkImport
          onClose={() => setShowImport(false)}
          onSuccess={() => queryClient.invalidateQueries(['contacts'])}
        />
      )}
    </div>
  );
}
