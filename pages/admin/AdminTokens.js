import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { UserCheck, UserX, RefreshCw, Key } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

export default function AdminTokens() {
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error: fetchError } = useQuery({
    queryKey: ['usersWithApproval'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      return res.json();
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, approved }) => {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approved }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['usersWithApproval']);
      setResult({ success: true, message: data.message });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 5000);
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch('/api/admin/users/regenerate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to regenerate token');
      }
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries(['usersWithApproval']);
      await queryClient.refetchQueries(['usersWithApproval']);
      setResult({ success: true, message: data.message });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 5000);
    },
  });

  const handleApprove = (userId, approved) => {
    approveUserMutation.mutate({ userId, approved });
  };

  const handleRegenerateToken = (userId) => {
    regenerateTokenMutation.mutate(userId);
  };

  const pendingCount = users.filter(u => !u.is_approved).length;
  const approvedCount = users.filter(u => u.is_approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries(['usersWithApproval'])}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {fetchError && (
        <Alert variant="destructive">
          <AlertDescription>Error loading users: {fetchError.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Approved Users</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Pending Approval</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            User Access & Tokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Access Token</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {user.access_token ? (
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-gray-400" />
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {user.access_token}
                            </code>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No token</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.is_approved ? (
                          <Badge variant="default" className="bg-green-500">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {!user.is_approved ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(user.id, true)}
                                disabled={approveUserMutation.isPending}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(user.id, false)}
                                disabled={approveUserMutation.isPending}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Deny
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegenerateToken(user.id)}
                                disabled={regenerateTokenMutation.isPending}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                New Token
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(user.id, false)}
                                disabled={approveUserMutation.isPending}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

