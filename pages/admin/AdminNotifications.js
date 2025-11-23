import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Bell, Plus, Trash2, Users, User as UserIcon, Info, AlertTriangle, CheckCircle, XCircle, Settings as SettingsIcon } from 'lucide-react';

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    target_type: 'all', // 'all', 'user', 'role'
    target_user_id: '',
    target_role: '',
  });

  // Check if system notifications are enabled
  useEffect(() => {
    const checkSystemSettings = async () => {
      try {
        const token = localStorage.getItem('sb-access-token');
        const res = await fetch('/api/admin/system-config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const config = await res.json();
          setSystemEnabled(config.enable_system_notifications === 'true');
        }
      } catch (error) {
        console.error('Failed to check system settings:', error);
      }
    };
    checkSystemSettings();
  }, []);

  // Fetch all users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
  });

  // Create notification mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create notification');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminNotifications']);
      setShowCreateModal(false);
      setNewNotification({
        title: '',
        message: '',
        type: 'info',
        target_type: 'all',
        target_user_id: '',
        target_role: '',
      });
      alert('Notification created successfully');
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete notification');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminNotifications']);
      alert('Notification deleted');
    },
  });

  const handleCreate = () => {
    const payload = {
      title: newNotification.title,
      message: newNotification.message,
      type: newNotification.type,
    };

    if (newNotification.target_type === 'user') {
      payload.target_user_id = newNotification.target_user_id;
    } else if (newNotification.target_type === 'role') {
      payload.target_role = newNotification.target_role;
    } else {
      payload.target_role = 'user'; // Send to all regular users
    }

    createMutation.mutate(payload);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'info': return <Info className="w-4 h-4 text-blue-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
      <div className="p-6">
        <div className="flex items-center justify-end gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/admin/AdminSettings'}
            className="gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            Notification Settings
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2" disabled={!systemEnabled}>
            <Plus className="w-4 h-4" />
            Create Notification
          </Button>
        </div>

        {!systemEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-900 font-medium">System Notifications Disabled</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Enable system notifications in <Link href="/admin/AdminSettings" className="underline font-medium">System Settings</Link> to send notifications to users.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No notifications yet
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell>{getTypeIcon(notif.type)}</TableCell>
                      <TableCell className="font-medium">{notif.title}</TableCell>
                      <TableCell className="max-w-md truncate">{notif.message}</TableCell>
                      <TableCell>
                        {notif.target_user_id ? (
                          <span className="text-sm">Specific User</span>
                        ) : (
                          <span className="text-sm capitalize">{notif.target_role || 'All'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(notif.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(notif.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Notification Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Create Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    placeholder="Notification title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <Textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                    placeholder="Notification message"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={newNotification.type}
                    onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target</label>
                  <select
                    value={newNotification.target_type}
                    onChange={(e) => setNewNotification({ ...newNotification, target_type: e.target.value })}
                    className="w-full border rounded px-3 py-2 mb-2"
                  >
                    <option value="all">All Users</option>
                    <option value="role">By Role</option>
                    <option value="user">Specific User</option>
                  </select>

                  {newNotification.target_type === 'role' && (
                    <select
                      value={newNotification.target_role}
                      onChange={(e) => setNewNotification({ ...newNotification, target_role: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admins</option>
                      <option value="user">Users</option>
                    </select>
                  )}

                  {newNotification.target_type === 'user' && (
                    <select
                      value={newNotification.target_user_id}
                      onChange={(e) => setNewNotification({ ...newNotification, target_user_id: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select User</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreate}
                    disabled={!newNotification.title || !newNotification.message || createMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}
