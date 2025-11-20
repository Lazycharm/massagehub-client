import React, { useState } from 'react';
import { api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Reports() {
  const [timeRange, setTimeRange] = useState('7days');

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.messages.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.contacts.list()
  });

  // Filter by time range with defensive guards
  const getDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
  const filteredMessages = messages.filter(m => {
    // Defensive: Check if created_at exists
    if (!m.created_at) return false;
    return m.created_at >= getDaysAgo(daysMap[timeRange]);
  });

  // Delivery success rate
  const totalSent = filteredMessages.filter(m => m.direction === 'outbound').length;
  const delivered = filteredMessages.filter(m => m.status === 'delivered').length;
  const failed = filteredMessages.filter(m => m.status === 'failed').length;
  const sent = filteredMessages.filter(m => m.status === 'sent').length;
  const pending = filteredMessages.filter(m => m.status === 'pending').length;
  
  // Calculate delivery rate safely
  const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : '0';

  // Status breakdown
  const statusData = [
    { name: 'Delivered', value: delivered, color: '#10b981' },
    { name: 'Sent', value: sent, color: '#3b82f6' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
    { name: 'Failed', value: failed, color: '#ef4444' }
  ];

  // By country (defensive against missing region)
  const countryStats = {};
  filteredMessages.forEach(m => {
    const country = m.region || 'Unknown';
    countryStats[country] = (countryStats[country] || 0) + 1;
  });
  const countryData = Object.entries(countryStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Daily stats (defensive against missing created_at)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyStats = last30Days.map(date => {
    const dayMessages = messages.filter(m => {
      // Defensive: Check if created_at exists before using it
      return m.created_at && m.created_at.startsWith(date);
    });
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: dayMessages.length,
      delivered: dayMessages.filter(m => m.status === 'delivered').length,
      failed: dayMessages.filter(m => m.status === 'failed').length
    };
  });

  // Type breakdown
  const smsCount = filteredMessages.filter(m => m.type === 'sms').length;
  const emailCount = filteredMessages.filter(m => m.type === 'email').length;
  const typeData = [
    { name: 'SMS', value: smsCount },
    { name: 'Email', value: emailCount }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500 mt-1">Detailed insights into your messaging activity</p>
        </div>
        <div className="flex gap-3">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList>
              <TabsTrigger value="7days">7 Days</TabsTrigger>
              <TabsTrigger value="30days">30 Days</TabsTrigger>
              <TabsTrigger value="90days">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Messages</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalSent}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Delivery Rate</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{deliveryRate}%</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{failed}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Contacts</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{contacts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Daily Message Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="delivered" stroke="#10b981" name="Delivered" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Message Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Country */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Messages by Region (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Types */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Message Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
