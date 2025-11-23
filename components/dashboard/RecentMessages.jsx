import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MessageSquare, Mail, Clock, ArrowUp, ArrowDown } from 'lucide-react';

export default function RecentMessages({ messages }) {
  const getStatusColor = (status) => {
    const colors = {
      delivered: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      queued: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Recent Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No messages yet</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                <div className={`p-2 rounded-lg ${message.type === 'sms' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  {message.type === 'sms' ? (
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Mail className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      {message.direction === 'outbound' ? (
                        <ArrowUp className="w-3 h-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-green-500" />
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {message.direction === 'outbound' ? message.to_number : message.from_number}
                      </p>
                    </div>
                    <Badge className={getStatusColor(message.status)}>
                      {message.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 truncate mb-1">{message.content}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(message.created_at)}</span>
                    <span>•</span>
                    <span className="capitalize">{message.type}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}