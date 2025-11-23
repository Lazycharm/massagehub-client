import React, { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Users, Trash2, Edit, UserPlus } from 'lucide-react';
import GroupForm from '../components/groups/GroupForm';
import ManageGroupMembers from '../components/groups/ManageGroupMembers';

export default function Groups() {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [managingGroup, setManagingGroup] = useState(null);
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.groups.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.groups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowForm(false);
      setEditingGroup(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.groups.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowForm(false);
      setEditingGroup(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.groups.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['groups'])
  });

  const handleSubmit = (data) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure? This will delete the group and all its members.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.contact_count || 0} contacts</p>
                    </div>
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManagingGroup(group)}
                    className="flex-1"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(group)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No groups yet. Create your first group!</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <GroupForm
          group={editingGroup}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingGroup(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {managingGroup && (
        <ManageGroupMembers
          group={managingGroup}
          onClose={() => setManagingGroup(null)}
        />
      )}
    </div>
  );
}
