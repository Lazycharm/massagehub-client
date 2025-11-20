import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Database, Plus, Edit, Trash2, CheckCircle, XCircle, Wifi, AlertTriangle } from 'lucide-react';

export default function AdminProviders() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({
    provider_type: 'sms',
    provider_name: '',
    credentials: {},
    config: {},
    is_active: true
  });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create provider');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['providers']);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update provider');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['providers']);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete provider');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['providers']);
    }
  });

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/providers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: formData.provider_type,
          provider_name: formData.provider_name,
          credentials: formData.credentials
        }),
      });

      const result = await res.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      provider_type: provider.provider_type,
      provider_name: provider.provider_name,
      credentials: provider.credentials || {},
      config: provider.config || {},
      is_active: provider.is_active
    });
    setIsFormOpen(true);
    setTestResult(null);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this provider?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      provider_type: 'sms',
      provider_name: '',
      credentials: {},
      config: {},
      is_active: true
    });
    setEditingProvider(null);
    setIsFormOpen(false);
    setTestResult(null);
  };

  const updateCredentials = (key, value) => {
    setFormData(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: value }
    }));
  };

  const getProviderIcon = (type) => {
    switch (type) {
      case 'sms': return '📱';
      case 'email': return '✉️';
      case 'viber': return '💬';
      case 'whatsapp': return '📞';
      default: return '📡';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Providers</h1>
          <p className="text-gray-500 mt-1">Manage messaging service providers</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Provider
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
                <p className="text-sm text-gray-600">Total Providers</p>
                <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {providers.filter(p => p.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <span className="text-2xl">📱</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">SMS Providers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {providers.filter(p => p.provider_type === 'sms').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <span className="text-2xl">✉️</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email Providers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {providers.filter(p => p.provider_type === 'email').length}
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
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Provider Type *</Label>
                  <select
                    value={formData.provider_type}
                    onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="viber">Viber</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <Label>Provider Name *</Label>
                  {formData.provider_type === 'sms' ? (
                    <select
                      value={formData.provider_name}
                      onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select SMS Provider</option>
                      <option value="Twilio">Twilio</option>
                      <option value="Infobip">Infobip</option>
                      <option value="Base44">Base44</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <Input
                      value={formData.provider_name}
                      onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                      placeholder="e.g., Gmail, SendGrid"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Credentials based on provider type */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Credentials</h3>
                
                {formData.provider_type === 'sms' && (
                  <>
                    {formData.provider_name.toLowerCase().includes('twilio') ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <Label>Account SID</Label>
                            <Input
                              value={formData.credentials.accountSid || ''}
                              onChange={(e) => updateCredentials('accountSid', e.target.value)}
                              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                          </div>
                          <div>
                            <Label>Auth Token</Label>
                            <Input
                              type="password"
                              value={formData.credentials.authToken || ''}
                              onChange={(e) => updateCredentials('authToken', e.target.value)}
                              placeholder="Your Twilio auth token"
                            />
                          </div>
                        </div>
                      </>
                    ) : formData.provider_name.toLowerCase().includes('infobip') ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              value={formData.credentials.apiKey || ''}
                              onChange={(e) => updateCredentials('apiKey', e.target.value)}
                              placeholder="Your Infobip API key"
                            />
                          </div>
                          <div>
                            <Label>Base URL</Label>
                            <Input
                              value={formData.credentials.baseUrl || ''}
                              onChange={(e) => updateCredentials('baseUrl', e.target.value)}
                              placeholder="https://xxxxx.api.infobip.com"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Find your base URL in Infobip portal under API Settings
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={formData.credentials.apiKey || ''}
                          onChange={(e) => updateCredentials('apiKey', e.target.value)}
                          placeholder="Your API key"
                        />
                      </div>
                    )}
                  </>
                )}

                {formData.provider_type === 'email' && (
                  <div className="space-y-3">
                    <div>
                      <Label>SMTP Host</Label>
                      <Input
                        value={formData.credentials.smtp_host || ''}
                        onChange={(e) => updateCredentials('smtp_host', e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        value={formData.credentials.smtp_port || ''}
                        onChange={(e) => updateCredentials('smtp_port', e.target.value)}
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <Label>SMTP Username</Label>
                      <Input
                        value={formData.credentials.smtp_user || ''}
                        onChange={(e) => updateCredentials('smtp_user', e.target.value)}
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div>
                      <Label>SMTP Password</Label>
                      <Input
                        type="password"
                        value={formData.credentials.smtp_pass || ''}
                        onChange={(e) => updateCredentials('smtp_pass', e.target.value)}
                        placeholder="Your password or app password"
                      />
                    </div>
                  </div>
                )}

                {formData.provider_type === 'viber' && (
                  <div>
                    <Label>Auth Token</Label>
                    <Input
                      type="password"
                      value={formData.credentials.authToken || ''}
                      onChange={(e) => updateCredentials('authToken', e.target.value)}
                      placeholder="Your Viber auth token"
                    />
                  </div>
                )}

                {formData.provider_type === 'whatsapp' && (
                  <div className="space-y-3">
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={formData.credentials.apiKey || ''}
                        onChange={(e) => updateCredentials('apiKey', e.target.value)}
                        placeholder="Your WhatsApp Business API key"
                      />
                    </div>
                    <div>
                      <Label>Phone Number ID</Label>
                      <Input
                        value={formData.credentials.phoneNumberId || ''}
                        onChange={(e) => updateCredentials('phoneNumberId', e.target.value)}
                        placeholder="Your WhatsApp phone number ID"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Test Connection Result */}
              {testResult && (
                <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  {testResult.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                  <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">Active Provider</Label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !formData.provider_name}
                  className="gap-2"
                >
                  <Wifi className="w-4 h-4" />
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProvider ? 'Update' : 'Create'} Provider
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Providers Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Type</TableHead>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading providers...
                    </TableCell>
                  </TableRow>
                ) : providers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No providers configured. Click "Add Provider" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  providers.map((provider) => (
                    <TableRow key={provider.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
                          <span className="font-medium capitalize">{provider.provider_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{provider.provider_name}</TableCell>
                      <TableCell>
                        {provider.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(provider.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(provider)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(provider.id)}
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
