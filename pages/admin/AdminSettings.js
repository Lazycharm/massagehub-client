import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Plus, Trash2, Settings, Database, Mail, Shield, Bell, Info, Save } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

export default function AdminSettings() {
  const [newSetting, setNewSetting] = useState({ key: '', value: '', category: 'general' });
  const [result, setResult] = useState(null);
  const [systemConfig, setSystemConfig] = useState({
    // Email Configuration
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'MessageHub',
    
    // Default User Quotas
    default_sms_quota: '1000',
    default_email_quota: '500',
    default_quota_period: '30', // days
    
    // Security Settings
    min_password_length: '8',
    require_special_char: true,
    session_timeout: '24', // hours
    max_login_attempts: '5',
    
    // Notification Settings
    admin_alert_email: '',
    low_quota_threshold: '10', // percentage
    enable_system_notifications: true,
  });
  
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.list
  });

  // Fetch system stats
  const { data: systemStats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    }
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

  const handleSaveConfig = async (category) => {
    try {
      const token = localStorage.getItem('sb-access-token');
      
      // Map of config keys to save based on category
      const configMap = {
        'Notification': {
          admin_alert_email: systemConfig.admin_alert_email,
          low_quota_threshold: systemConfig.low_quota_threshold,
          enable_system_notifications: systemConfig.enable_system_notifications,
        },
        'Email': {
          smtp_host: systemConfig.smtp_host,
          smtp_port: systemConfig.smtp_port,
          smtp_user: systemConfig.smtp_user,
          smtp_password: systemConfig.smtp_password,
          smtp_from_email: systemConfig.smtp_from_email,
          smtp_from_name: systemConfig.smtp_from_name,
        },
        'Quota': {
          default_sms_quota: systemConfig.default_sms_quota,
          default_email_quota: systemConfig.default_email_quota,
          default_quota_period: systemConfig.default_quota_period,
        },
        'Security': {
          min_password_length: systemConfig.min_password_length,
          require_special_char: systemConfig.require_special_char,
          session_timeout: systemConfig.session_timeout,
          max_login_attempts: systemConfig.max_login_attempts,
        }
      };

      const configToSave = configMap[category];
      
      if (configToSave) {
        const res = await fetch('/api/admin/system-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ config: configToSave, category }),
        });

        if (!res.ok) {
          throw new Error('Failed to save configuration');
        }
      }

      setResult({ success: true, message: `${category} configuration saved!` });
      setTimeout(() => setResult(null), 3000);
    } catch (error) {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 3000);
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure application-wide settings and preferences</p>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'} className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Main Settings Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="system" className="gap-2">
            <Info className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="quotas" className="gap-2">
            <Database className="w-4 h-4" />
            Quotas
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Settings className="w-4 h-4" />
            Custom
          </TabsTrigger>
        </TabsList>

        {/* System Information Tab */}
        <TabsContent value="system">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Total Users</div>
                    <div className="text-2xl font-bold text-gray-900">{systemStats?.totalUsers || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Total Messages</div>
                    <div className="text-2xl font-bold text-gray-900">{systemStats?.totalMessages || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">Active Chatrooms</div>
                    <div className="text-2xl font-bold text-gray-900">{systemStats?.activeChatrooms || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Application Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Version</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Database</span>
                    <Badge className="bg-green-500">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Deployment</span>
                    <span className="font-medium">Production</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Configuration Tab */}
        <TabsContent value="email">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Email (SMTP) Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>SMTP Host</Label>
                  <Input
                    value={systemConfig.smtp_host}
                    onChange={(e) => setSystemConfig({...systemConfig, smtp_host: e.target.value})}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label>SMTP Port</Label>
                  <Input
                    value={systemConfig.smtp_port}
                    onChange={(e) => setSystemConfig({...systemConfig, smtp_port: e.target.value})}
                    placeholder="587"
                  />
                </div>
                <div>
                  <Label>SMTP Username</Label>
                  <Input
                    value={systemConfig.smtp_user}
                    onChange={(e) => setSystemConfig({...systemConfig, smtp_user: e.target.value})}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <Label>SMTP Password</Label>
                  <Input
                    type="password"
                    value={systemConfig.smtp_password}
                    onChange={(e) => setSystemConfig({...systemConfig, smtp_password: e.target.value})}
                    placeholder="Your app password"
                  />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input
                    value={systemConfig.smtp_from_email}
                    onChange={(e) => setSystemConfig({...systemConfig, smtp_from_email: e.target.value})}
                    placeholder="noreply@messagehub.space"
                  />
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={systemConfig.smtp_from_name}
                    onChange={(e) => setSystemConfig({...systemConfig, smtp_from_name: e.target.value})}
                    placeholder="MessageHub"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveConfig('Email')} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Email Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Quotas Tab */}
        <TabsContent value="quotas">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Default User Quotas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  These quotas will be applied to newly created users by default.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>SMS Quota (per period)</Label>
                  <Input
                    type="number"
                    value={systemConfig.default_sms_quota}
                    onChange={(e) => setSystemConfig({...systemConfig, default_sms_quota: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email Quota (per period)</Label>
                  <Input
                    type="number"
                    value={systemConfig.default_email_quota}
                    onChange={(e) => setSystemConfig({...systemConfig, default_email_quota: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Quota Period (days)</Label>
                  <Input
                    type="number"
                    value={systemConfig.default_quota_period}
                    onChange={(e) => setSystemConfig({...systemConfig, default_quota_period: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Quotas reset every {systemConfig.default_quota_period} days
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveConfig('Quota')} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Quota Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Security & Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Minimum Password Length</Label>
                  <Input
                    type="number"
                    value={systemConfig.min_password_length}
                    onChange={(e) => setSystemConfig({...systemConfig, min_password_length: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="require_special"
                    checked={systemConfig.require_special_char}
                    onChange={(e) => setSystemConfig({...systemConfig, require_special_char: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="require_special">Require special characters in passwords</Label>
                </div>
                <div>
                  <Label>Session Timeout (hours)</Label>
                  <Input
                    type="number"
                    value={systemConfig.session_timeout}
                    onChange={(e) => setSystemConfig({...systemConfig, session_timeout: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={systemConfig.max_login_attempts}
                    onChange={(e) => setSystemConfig({...systemConfig, max_login_attempts: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Account will be locked after this many failed attempts
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveConfig('Security')} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                Admin Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">Send Custom Notifications</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Visit the <Link href="/admin/AdminNotifications" className="underline font-medium">Notifications Management</Link> page to send custom notifications to users.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Admin Alert Email</Label>
                  <Input
                    type="email"
                    value={systemConfig.admin_alert_email}
                    onChange={(e) => setSystemConfig({...systemConfig, admin_alert_email: e.target.value})}
                    placeholder="admin@messagehub.space"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Receive system alerts and low quota warnings
                  </p>
                </div>
                <div>
                  <Label>Low Quota Threshold (%)</Label>
                  <Input
                    type="number"
                    value={systemConfig.low_quota_threshold}
                    onChange={(e) => setSystemConfig({...systemConfig, low_quota_threshold: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert when user quota falls below this percentage
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enable_notifications"
                    checked={systemConfig.enable_system_notifications}
                    onChange={(e) => setSystemConfig({...systemConfig, enable_system_notifications: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="enable_notifications">Enable system notifications</Label>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSaveConfig('Notification')} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Settings Tab (Original functionality) */}
        <TabsContent value="custom">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Custom Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">{/* Add New Setting */}
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

              {/* Settings Table */}
              <div className="mt-6">
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
                          No custom settings configured
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
      </Tabs>
    </div>
  );
}

