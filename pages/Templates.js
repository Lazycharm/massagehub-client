import React, { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, MessageSquare, Mail, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import TemplateForm from '../components/templates/TemplateForm';

export default function Templates() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', activeTab],
    queryFn: () => api.templates.list(activeTab !== 'all' ? activeTab : undefined)
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.templates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setShowForm(false);
      setEditingTemplate(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.templates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setShowForm(false);
      setEditingTemplate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.templates.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['templates'])
  });

  const handleSubmit = (data) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredTemplates = templates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-20 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${template.type === 'sms' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {template.type === 'sms' ? (
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Mail className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.category && (
                        <Badge variant="outline" className="mt-1">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={template.type === 'sms' ? 'bg-blue-500' : 'bg-purple-500'}>
                    {template.type.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject && (
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Subject: {template.subject}
                  </p>
                )}
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-4 line-clamp-3">
                  {template.content}
                </p>
                {template.usage_count > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Used {template.usage_count} times
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(template.content);
                      alert('Template copied to clipboard!');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No templates yet. Create your first template!</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
