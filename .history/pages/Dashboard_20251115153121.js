import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../src/MessageHub/components/ui/card';
import { MessageSquare, Mail, Users, TrendingUp, Send, Inbox, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatsCard from '../src/MessageHub/components/dashboard/StatsCard';
import RecentMessages from '../src/MessageHub/components/dashboard/RecentMessages';

export default function Dashboard() {
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: inboundMessages = [] } = useQuery({
    queryKey: ['inboundMessages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbound_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  const stats = {
    totalSent: messages.filter(m => m.from_number).length,
    totalDelivered: messages.filter(m => m.status === 'delivered').length,
    totalContacts: contacts.length,
    totalInbound: inboundMessages.length,
    deliveryRate: messages.filter(m => m.from_number).length > 0
      ? ((messages.filter(m => m.status === 'delivered').length / messages.filter(m => m.from_number).length) * 100).toFixed(1)
      : 0
  };

  // Chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => {
    const dayMessages = messages.filter(m => m.created_at?.startsWith(date));
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      SMS: dayMessages.filter(m => m.type === 'sms').length,
      Email: dayMessages.filter(m => m.type === 'email').length
    };
  });

  const typeData = [
    { name: 'SMS', value: messages.filter(m => m.type === 'sms').length },
    { name: 'Email', value: messages.filter(m => m.type === 'email').length }
  ];

  const statusData = [
    { name: 'Delivered', value: messages.filter(m => m.status === 'delivered').length },
    { name: 'Sent', value: messages.filter(m => m.status === 'sent' || m.status === 'queued').length },
    { name: 'Pending', value: messages.filter(m => m.status === 'pending').length },
    { name: 'Failed', value: messages.filter(m => m.status === 'failed').length }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Sent"
          value={stats.totalSent}
          icon={Send}
          color="blue"
          trend="+12% from last month"
        />
        <StatsCard
          title="Delivered"
          value={stats.totalDelivered}
          icon={CheckCircle}
          color="green"
          trend={`${stats.deliveryRate}% delivery rate`}
        />
        <StatsCard
          title="Contacts"
          value={stats.totalContacts}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Inbox"
          value={stats.totalInbound}
          icon={Inbox}
          color="indigo"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Daily Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="SMS" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Email" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Types */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Message Distribution
            </CardTitle>
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
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-green-600" />
              Message Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <RecentMessages messages={messages.slice(0, 5)} />
      </div>
    </div>
  );
}

  const stats = {
    totalSent: messages.filter(m => m.direction === 'outbound').length,
    totalDelivered: messages.filter(m => m.status === 'delivered').length,
    totalContacts: contacts.length,
    totalInbound: inboundMessages.length,
    deliveryRate: messages.filter(m => m.direction === 'outbound').length > 0
      ? ((messages.filter(m => m.status === 'delivered').length / messages.filter(m => m.direction === 'outbound').length) * 100).toFixed(1)
      : 0
  };

  // Chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => {
    const dayMessages = messages.filter(m => m.created_date?.startsWith(date));
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      SMS: dayMessages.filter(m => m.type === 'sms').length,
      Email: dayMessages.filter(m => m.type === 'email').length
    };
  });

  const typeData = [
    { name: 'SMS', value: messages.filter(m => m.type === 'sms').length },
    { name: 'Email', value: messages.filter(m => m.type === 'email').length }
  ];

  const statusData = [
    { name: 'Delivered', value: messages.filter(m => m.status === 'delivered').length },
    { name: 'Sent', value: messages.filter(m => m.status === 'sent').length },
    { name: 'Pending', value: messages.filter(m => m.status === 'pending').length },
    { name: 'Failed', value: messages.filter(m => m.status === 'failed').length }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Sent"
          value={stats.totalSent}
          icon={Send}
          color="blue"
          trend="+12% from last month"
        />
        <StatsCard
          title="Delivered"
          value={stats.totalDelivered}
          icon={CheckCircle}
          color="green"
          trend={`${stats.deliveryRate}% delivery rate`}
        />
        <StatsCard
          title="Contacts"
          value={stats.totalContacts}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Inbox"
          value={stats.totalInbound}
          icon={Inbox}
          color="indigo"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Daily Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="SMS" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Email" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Types */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Message Distribution
            </CardTitle>
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
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-green-600" />
              Message Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <RecentMessages messages={messages.slice(0, 5)} />
      </div>
    </div>
  );
}