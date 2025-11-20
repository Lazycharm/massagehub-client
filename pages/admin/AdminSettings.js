import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

export default function AdminSettings() {
  const [newSetting, setNewSetting] = useState({ key: '', value: '', category: 'general' });
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.list
  });

  const createMutation = useMutation({
    mutationFn: api.settings.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      setNewSetting({ key: '', value: '', category: 'general' });
      setResult({ success: true, message: 'Setting added successfully!' });
      setTimeout(() => setResult(null), 3000);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.settings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      setResult({ success: true, message: 'Setting updated successfully!' });
      setTimeout(() => setResult(null), 3000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.settings.delete,
    onSuccess: () => queryClient.invalidateQueries(['settings'])
  });

  const handleAddSetting = () => {
    if (newSetting.key && newSetting.value) {
      createMutation.mutate(newSetting);
    }
  };

  const handleUpdateSetting = (id, key, value) => {
    updateMutation.mutate({ id, data: { key, value } });
  };

  const handleDeleteSetting = (id) => {
    if (confirm('Delete this setting?')) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      sms: 'bg-green-100 text-green-800',
      email: 'bg-purple-100 text-purple-800',
      notifications: 'bg-orange-100 text-orange-800',
      api: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure application-wide settings</p>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Add New Setting */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Setting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Setting Key</Label>
              <Input
                id="key"
                value={newSetting.key}
                onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                placeholder="e.g., max_sms_length"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={newSetting.value}
                onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                placeholder="Enter value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={newSetting.category}
                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="general">General</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="notifications">Notifications</option>
                <option value="api">API</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddSetting}
                disabled={!newSetting.key || !newSetting.value || createMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Setting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Table */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Settings</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading settings...
                        </TableCell>
                      </TableRow>
                    ) : settings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No settings configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      settings.map((setting) => (
                        <TableRow key={setting.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{setting.key}</TableCell>
                          <TableCell>
                            <Input
                              value={setting.value}
                              onChange={(e) => handleUpdateSetting(setting.id, setting.key, e.target.value)}
                              className="max-w-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(setting.category)}>
                              {setting.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSetting(setting.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {['general', 'sms', 'email', 'api'].map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Key</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settings.filter(s => s.category === category).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                            No {category} settings
                          </TableCell>
                        </TableRow>
                      ) : (
                        settings
                          .filter(s => s.category === category)
                          .map((setting) => (
                            <TableRow key={setting.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{setting.key}</TableCell>
                              <TableCell>
                                <Input
                                  value={setting.value}
                                  onChange={(e) => handleUpdateSetting(setting.id, setting.key, e.target.value)}
                                  className="max-w-xs"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSetting(setting.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

