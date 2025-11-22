import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { User, Bell, Shield, Save, Check, X, Key, Phone, Mail, Database } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function Settings() {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    messageAlerts: true,
    systemUpdates: true
  });
  const [result, setResult] = useState(null);
  const [passwordResult, setPasswordResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const token = localStorage.getItem('sb-access-token');
      
      // Fetch contacts
      const contactsRes = await fetch('/api/contacts/my-contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contacts = contactsRes.ok ? await contactsRes.json() : [];
      
      // Fetch chatrooms
      const chatroomsRes = await fetch('/api/user-chatrooms/my-chatrooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const chatrooms = chatroomsRes.ok ? await chatroomsRes.json() : [];
      
      return {
        totalContacts: contacts.length,
        favoriteContacts: contacts.filter(c => c.is_favorite).length,
        totalChatrooms: chatrooms.length
      };
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      setResult({ success: true, message: 'Profile updated successfully!' });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 3000);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem('sb-access-token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordResult({ success: true, message: 'Password changed successfully!' });
      setTimeout(() => setPasswordResult(null), 3000);
    },
    onError: (error) => {
      setPasswordResult({ success: false, message: error.message });
      setTimeout(() => setPasswordResult(null), 3000);
    }
  });

  const handleSaveProfile = () => {
    setResult(null);
    if (!profile.name.trim()) {
      setResult({ success: false, message: 'Name is required' });
      return;
    }
    updateProfileMutation.mutate({ name: profile.name.trim() });
  };

  const handleChangePassword = () => {
    setPasswordResult(null);
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordResult({ success: false, message: 'All fields are required' });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordResult({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordResult({ success: false, message: 'New passwords do not match' });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    // In a real app, you'd save this to the backend
    setTimeout(() => {
      setResult({ success: true, message: 'Notification preferences updated' });
      setTimeout(() => setResult(null), 2000);
    }, 300);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64 p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading settings...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{user?.name || 'User'}</h3>
                      <p className="text-gray-500">{user?.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user?.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user?.role?.toUpperCase() || 'USER'}
                        </span>
                        {user?.is_approved && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                        className="text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="bg-gray-50 text-gray-600"
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed. Contact your administrator.</p>
                    </div>
                  </div>

                  {result && (
                    <Alert variant={result.success ? 'default' : 'destructive'} className="border-l-4">
                      <AlertDescription className="flex items-center gap-2">
                        {result.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {result.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>

              {/* Account Stats */}
              {stats && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Account Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <Database className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalContacts}</p>
                            <p className="text-sm text-gray-600">Total Contacts</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-3">
                          <User className="w-8 h-8 text-yellow-600" />
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.favoriteContacts}</p>
                            <p className="text-sm text-gray-600">Favorites</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-3">
                          <Phone className="w-8 h-8 text-purple-600" />
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalChatrooms}</p>
                            <p className="text-sm text-gray-600">Chatrooms</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive updates via email</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotification('emailNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.emailNotifications ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Receive alerts via SMS</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotification('smsNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.smsNotifications ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-gray-900">Message Alerts</p>
                        <p className="text-sm text-gray-500">Get notified of new messages</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotification('messageAlerts')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.messageAlerts ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.messageAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-gray-900">System Updates</p>
                        <p className="text-sm text-gray-500">Important system announcements</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotification('systemUpdates')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications.systemUpdates ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.systemUpdates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                {passwordResult && (
                  <Alert variant={passwordResult.success ? 'default' : 'destructive'} className="border-l-4">
                    <AlertDescription className="flex items-center gap-2">
                      {passwordResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {passwordResult.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Key className="w-4 h-4 mr-2" />
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security Tips
                  </h4>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Use a strong password with at least 6 characters</li>
                    <li>Don't share your password with anyone</li>
                    <li>Change your password regularly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
