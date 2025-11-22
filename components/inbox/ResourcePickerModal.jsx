import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';

export default function ResourcePickerModal({ isOpen, onClose, chatroomId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addingContactId, setAddingContactId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch user's assigned resources
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['myResources'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/user-resources/my-resources', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch resources');
      return res.json();
    },
    enabled: isOpen,
  });

  // Filter to show only unimported resources
  const availableResources = resources
    .filter(r => !r.is_imported)
    .filter(r => 
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone_number?.includes(searchTerm)
    );

  const handleAddContact = async (resource) => {
    if (!chatroomId || addingContactId) return;
    
    setAddingContactId(resource.id);
    try {
      const token = localStorage.getItem('sb-access-token');
      
      // Create contact in the chatroom
      const res = await fetch(`/api/chatrooms/${chatroomId}/contacts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contacts: [{
            name: resource.name,
            phone_number: resource.phone_number,
            email: resource.email,
          }]
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add contact');
      }

      const result = await res.json();
      
      // Refresh resources and contacts
      queryClient.invalidateQueries(['myResources']);
      queryClient.invalidateQueries(['chatroomContacts', chatroomId]);
      
      // Close modal and notify parent to select the new contact
      if (result.created?.[0]) {
        onClose(result.created[0]);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Add contact error:', error);
      alert(`Failed to add contact: ${error.message}`);
    } finally {
      setAddingContactId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Contact</h2>
            <p className="text-sm text-gray-500 mt-1">Choose from your assigned resources</p>
          </div>
          <button
            onClick={() => onClose()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search resources by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Resources List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : availableResources.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchTerm ? 'No matching resources found' : 'No available resources to add'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {resources.filter(r => r.is_imported).length > 0
                  ? 'All your resources have been imported'
                  : 'Contact your admin to assign resources'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{resource.name}</p>
                      {resource.tags && (
                        <Badge variant="secondary" className="text-xs">
                          {resource.tags}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{resource.phone_number}</p>
                    {resource.email && (
                      <p className="text-xs text-gray-400 mt-1">{resource.email}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAddContact(resource)}
                    disabled={addingContactId === resource.id}
                    size="sm"
                    className="ml-4"
                  >
                    {addingContactId === resource.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Start Chat
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {availableResources.length} resource{availableResources.length !== 1 ? 's' : ''} available
            </p>
            <Button variant="outline" onClick={() => onClose()}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
