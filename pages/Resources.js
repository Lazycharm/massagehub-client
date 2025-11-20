import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Search,
  Tag as TagIcon,
  Download,
  CheckCircle,
  Circle,
  Database,
  Phone,
} from 'lucide-react';

export default function Resources() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, imported, available
  const [selectedResources, setSelectedResources] = useState(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedChatroom, setSelectedChatroom] = useState('');

  // Fetch user's assigned resources
  const { data: resources = [], isLoading: loadingResources } = useQuery({
    queryKey: ['myResources'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-resources/my-resources', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch resources');
      return res.json();
    },
  });

  // Fetch user's assigned chatrooms for import dropdown
  const { data: chatrooms = [], isLoading: loadingChatrooms } = useQuery({
    queryKey: ['myChatrooms'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-chatrooms/my-chatrooms', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      const data = await res.json();
      console.log('[Resources] My chatrooms response:', data);
      // data is array of assignments with chatroom info
      return data;
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ resource_ids, chatroom_id }) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-resources/import-to-chatroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resource_ids, chatroom_id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to import resources');
      }
      return res.json();
    },
    onSuccess: result => {
      queryClient.invalidateQueries(['myResources']);
      queryClient.invalidateQueries(['myChatrooms']);
      setShowImportModal(false);
      setSelectedResources(new Set());
      setSelectedChatroom('');
      alert(result.message);
    },
    onError: error => {
      alert(error.message);
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: resources.length,
      imported: resources.filter(r => r.is_imported).length,
      available: resources.filter(r => !r.is_imported).length,
      uniqueTags: [...new Set(resources.flatMap(r => r.tags || []))].length,
    };
  }, [resources]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        resource.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.first_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'imported' && resource.is_imported) ||
        (statusFilter === 'available' && !resource.is_imported);

      // Tag filter
      const matchesTag =
        !tagFilter ||
        (resource.tags &&
          resource.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase())));

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [resources, searchTerm, statusFilter, tagFilter]);

  // Get unique tags
  const allTags = useMemo(() => {
    return [...new Set(resources.flatMap(r => r.tags || []))].sort();
  }, [resources]);

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

  // Select all filtered available resources
  const toggleSelectAll = () => {
    const availableResources = filteredResources.filter(r => !r.is_imported);
    if (selectedResources.size === availableResources.length && availableResources.length > 0) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(availableResources.map(r => r.id)));
    }
  };

  // Handle import
  const handleImport = () => {
    if (!selectedChatroom) {
      alert('Please select a chatroom');
      return;
    }
    importMutation.mutate({
      resource_ids: Array.from(selectedResources),
      chatroom_id: selectedChatroom,
    });
  };

  // Handle export
  const handleExport = () => {
    const csvContent = [
      ['Phone Number', 'Label', 'Tags', 'Status', 'Created At'].join(','),
      ...filteredResources.map(r =>
        [
          r.phone_number,
          r.first_name || '',
          (r.tags || []).join('; '),
          r.is_imported ? 'Imported' : 'Available',
          new Date(r.created_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-resources-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    globalThis.URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Client Resources</h1>
            <p className="text-gray-600 mt-1">
              Client phone numbers assigned by admin. Import them to your lines to start messaging in Chatbox.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Available to Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Already Imported
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.imported}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueTags}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Selection */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by number or label..."
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
                <option value="imported">Imported Only</option>
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
                <span className="text-sm font-medium">{selectedResources.size} selected</span>
                <Button size="sm" onClick={() => setShowImportModal(true)}>
                  <Phone className="h-4 w-4 mr-1" />
                  Import to Chatroom
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

        {/* Import Modal */}
        {showImportModal && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Import {selectedResources.size} Resources to Chatroom</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Chatroom
                  </label>
                  {loadingChatrooms ? (
                    <div className="text-sm text-gray-500 py-2">Loading chatrooms...</div>
                  ) : (
                    <>
                      <select
                        value={selectedChatroom}
                        onChange={e => setSelectedChatroom(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        disabled={chatrooms.length === 0}
                      >
                        <option value="">-- Select a chatroom --</option>
                        {chatrooms.map(assignment => (
                          <option key={assignment.chatroom_id} value={assignment.chatroom_id}>
                            {assignment.chatroom?.name || 'Unnamed'} ({assignment.chatroom?.provider || 'Unknown'}) - {assignment.contact_count || 0} contacts
                          </option>
                        ))}
                      </select>
                      {chatrooms.length === 0 ? (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800 font-medium">⚠️ No chatrooms assigned</p>
                          <p className="text-xs text-red-600 mt-1">
                            Contact your admin to assign you to a chatroom first.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          {chatrooms.length} chatroom{chatrooms.length !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending || !selectedChatroom || loadingChatrooms}
                  >
                    {importMutation.isPending ? 'Importing...' : 'Import Resources'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedChatroom('');
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
            {loadingResources ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedResources.size > 0 &&
                          selectedResources.size ===
                            filteredResources.filter(r => !r.is_imported).length
                        }
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
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
                          disabled={resource.is_imported}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{resource.phone_number}</TableCell>
                      <TableCell>{resource.first_name || '-'}</TableCell>
                      <TableCell>
                        {resource.tags && resource.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {resource.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
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
                        {resource.is_imported ? (
                          <Badge className="bg-blue-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Imported
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500">
                            <Circle className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(resource.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loadingResources && filteredResources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No resources found</p>
                {resources.length === 0 && (
                  <p className="text-sm mt-2">
                    Contact your admin to assign resources to you
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
