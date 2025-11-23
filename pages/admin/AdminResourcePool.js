import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Plus,
  Upload,
  Download,
  Search,
  Tag as TagIcon,
  UserPlus,
  UserMinus,
  Pencil,
  Trash2,
  Database,
} from 'lucide-react';

export default function AdminResourcePool() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, available, assigned
  const [tagFilter, setTagFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [selectedResources, setSelectedResources] = useState(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignUserId, setBulkAssignUserId] = useState('');
  const fileInputRef = useRef(null);

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resourcePool'],
    queryFn: async () => {
      const res = await fetch('/api/resource-pool');
      if (!res.ok) throw new Error('Failed to fetch resources');
      return res.json();
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async newResource => {
      const res = await fetch('/api/resource-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResource),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create resource');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['resourcePool']);
      setShowForm(false);
      resetForm();
      alert(`Resource ${data.phone_number} created successfully!`);
    },
    onError: (error) => {
      alert(`Error creating resource: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`/api/resource-pool/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update resource');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['resourcePool']);
      setShowForm(false);
      setEditingResource(null);
      resetForm();
      alert(`Resource ${data.phone_number} updated successfully!`);
    },
    onError: (error) => {
      alert(`Error updating resource: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const res = await fetch(`/api/resource-pool/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete resource');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resourcePool']);
      alert('Resource deleted successfully!');
    },
    onError: (error) => {
      alert(`Error deleting resource: ${error.message}`);
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async formData => {
      const res = await fetch('/api/resource-pool/bulk-import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to import resources');
      }
      return res.json();
    },
    onSuccess: result => {
      queryClient.invalidateQueries(['resourcePool']);
      alert(
        `Imported ${result.imported} resources${
          result.skipped > 0 ? `, skipped ${result.skipped}` : ''
        }`
      );
    },
    onError: (error) => {
      alert(`Error importing resources: ${error.message}`);
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ resource_ids, user_id }) => {
      const res = await fetch('/api/resource-pool/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_ids, user_id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign resources');
      }
      return res.json();
    },
    onSuccess: result => {
      queryClient.invalidateQueries(['resourcePool']);
      setShowBulkAssign(false);
      setSelectedResources(new Set());
      setBulkAssignUserId('');
      alert(result.message);
    },
  });

  // Bulk unassign mutation
  const bulkUnassignMutation = useMutation({
    mutationFn: async resource_ids => {
      const res = await fetch('/api/resource-pool/bulk-unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_ids }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unassign resources');
      }
      return res.json();
    },
    onSuccess: result => {
      queryClient.invalidateQueries(['resourcePool']);
      setSelectedResources(new Set());
      alert(result.message);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    phone_number: '',
    label: '',
    tags: '',
    assigned_user_id: '',
    metadata: '',
  });

  const resetForm = () => {
    setFormData({
      phone_number: '',
      label: '',
      tags: '',
      assigned_user_id: '',
      metadata: '',
    });
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: resources.length,
      available: resources.filter(r => !r.assigned_to_user_id).length,
      assigned: resources.filter(r => r.assigned_to_user_id).length,
      uniqueTags: new Set(resources.flatMap(r => r.tags || [])).size,
    };
  }, [resources]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        resource.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.assigned_user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.assigned_user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && !resource.assigned_to_user_id) ||
        (statusFilter === 'assigned' && resource.assigned_to_user_id);

      // Tag filter
      const matchesTag =
        !tagFilter ||
        resource.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [resources, searchTerm, statusFilter, tagFilter]);

  // Get unique tags from all resources
  const allTags = useMemo(() => {
    return [...new Set(resources.flatMap(r => r.tags || []))].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  // Handle form submission
  const handleSubmit = e => {
    e.preventDefault();

    const tagsArray = formData.tags
      ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    let metadataObj = {};
    if (formData.metadata) {
      try {
        metadataObj = JSON.parse(formData.metadata);
      } catch (err) {
        alert(`Invalid JSON in metadata field: ${err.message}`);
        return;
      }
    }

    const resourceData = {
      phone_number: formData.phone_number,
      first_name: formData.label || formData.phone_number,
      tags: tagsArray,
      assigned_to_user_id: formData.assigned_user_id || null,
      metadata: metadataObj,
    };

    if (editingResource) {
      updateMutation.mutate({
        id: editingResource.id,
        updates: resourceData,
      });
    } else {
      createMutation.mutate(resourceData);
    }
  };

  // Handle edit
  const handleEdit = resource => {
    setEditingResource(resource);
    setFormData({
      phone_number: resource.phone_number,
      label: resource.first_name || '',
      tags: resource.tags ? resource.tags.join(', ') : '',
      assigned_user_id: resource.assigned_to_user_id || '',
      metadata: Object.keys(resource.metadata || {}).length > 0
        ? JSON.stringify(resource.metadata, null, 2)
        : '',
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = resource => {
    if (confirm(`Delete resource ${resource.phone_number}?`)) {
      deleteMutation.mutate(resource.id);
    }
  };

  // Handle bulk import
  const handleBulkImport = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    bulkImportMutation.mutate(formData);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle export
  const handleExport = () => {
    const csvContent = [
      ['phone_number', 'label', 'tags', 'assigned_user_email', 'metadata'].join(','),
      ...filteredResources.map(r =>
        [
          r.phone_number,
          r.first_name || '',
          (r.tags || []).join(';'),
          r.assigned_user?.email || '',
          JSON.stringify(r.metadata || {}),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-pool-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    globalThis.URL.revokeObjectURL(url);
  };

  // Toggle resource selection
  const toggleResourceSelection = resourceId => {
    const newSelection = new Set(selectedResources);
    if (newSelection.has(resourceId)) {
      newSelection.delete(resourceId);
    } else {
      newSelection.add(resourceId);
    }
    setSelectedResources(newSelection);
  };

  // Select all filtered resources
  const toggleSelectAll = () => {
    if (selectedResources.size === filteredResources.length) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(filteredResources.map(r => r.id)));
    }
  };

  // Handle bulk assign
  const handleBulkAssign = () => {
    if (!bulkAssignUserId) {
      alert('Please select a user');
      return;
    }
    bulkAssignMutation.mutate({
      resource_ids: Array.from(selectedResources),
      user_id: bulkAssignUserId,
    });
  };

  // Handle bulk unassign
  const handleBulkUnassign = () => {
    if (confirm(`Unassign ${selectedResources.size} selected resources?`)) {
      bulkUnassignMutation.mutate(Array.from(selectedResources));
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleBulkImport}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkImportMutation.isPending}
              title="CSV format: phone_number,label,tags,assigned_user_email,metadata"
            >
              <Upload className="h-4 w-4 mr-2" />
              {bulkImportMutation.isPending ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => {
              setShowForm(!showForm);
              if (!showForm) {
                setEditingResource(null);
                resetForm();
              }
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Unique Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueTags}</div>
            </CardContent>
          </Card>
        </div>

        {/* CSV Format Help */}
        {showForm && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900">
                <strong>CSV Format:</strong> phone_number, label, tags, assigned_user_email, metadata
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Example: +1234567890, VIP Client, vip;priority, user@example.com, {"{}"} 
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={e =>
                        setFormData({ ...formData, phone_number: e.target.value })
                      }
                      placeholder="+1234567890"
                      required
                      disabled={editingResource} // Can't change phone number
                    />
                  </div>
                  <div>
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={e => setFormData({ ...formData, label: e.target.value })}
                      placeholder="Optional label"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="vip, priority, region-east"
                    />
                    {allTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-gray-600">Existing tags:</span>
                        {allTags.slice(0, 10).map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs cursor-pointer"
                            onClick={() => {
                              const current = formData.tags ? formData.tags + ', ' : '';
                              setFormData({ ...formData, tags: current + tag });
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="assigned_user_id">Assign to User</Label>
                    <select
                      id="assigned_user_id"
                      value={formData.assigned_user_id}
                      onChange={e =>
                        setFormData({ ...formData, assigned_user_id: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">-- Unassigned --</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="metadata">Metadata (JSON)</Label>
                  <textarea
                    id="metadata"
                    value={formData.metadata}
                    onChange={e =>
                      setFormData({ ...formData, metadata: e.target.value })
                    }
                    placeholder='{"key": "value"}'
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingResource ? 'Update' : 'Create'} Resource
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingResource(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters and Bulk Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by number, label, or user..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="all">All Resources</option>
                <option value="available">Available Only</option>
                <option value="assigned">Assigned Only</option>
              </select>
              <Input
                placeholder="Filter by tag..."
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
              />
              <div className="text-sm text-gray-600 flex items-center">
                {filteredResources.length !== resources.length && (
                  <span>
                    {filteredResources.length} of {resources.length} resources
                  </span>
                )}
              </div>
            </div>

            {selectedResources.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium">
                  {selectedResources.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkAssign(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign to User
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkUnassign}
                  disabled={bulkUnassignMutation.isPending}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Unassign
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedResources(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Assign Modal */}
        {showBulkAssign && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Assign {selectedResources.size} Resources to User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk_assign_user">Select User</Label>
                  <select
                    id="bulk_assign_user"
                    value={bulkAssignUserId}
                    onChange={e => setBulkAssignUserId(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Select a user --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkAssign}
                    disabled={bulkAssignMutation.isPending || !bulkAssignUserId}
                  >
                    Assign Resources
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkAssign(false);
                      setBulkAssignUserId('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resources Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          filteredResources.length > 0 &&
                          selectedResources.size === filteredResources.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map(resource => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedResources.has(resource.id)}
                          onChange={() => toggleResourceSelection(resource.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{resource.phone_number}</TableCell>
                      <TableCell>{resource.first_name || '-'}</TableCell>
                      <TableCell>
                        {resource.tags && resource.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {resource.tags.map((tag) => (
                              <Badge key={`${resource.id}-${tag}`} variant="outline" className="text-xs">
                                <TagIcon className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resource.assigned_user ? (
                          <div>
                            <div className="font-medium">{resource.assigned_user.name}</div>
                            <div className="text-sm text-gray-600">
                              {resource.assigned_user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resource.assigned_to_user_id ? (
                          <Badge className="bg-blue-500">Assigned</Badge>
                        ) : (
                          <Badge className="bg-green-500">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(resource.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(resource)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(resource)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && filteredResources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No resources found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
