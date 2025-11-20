import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MessageSquare, Users, TrendingUp, Send, Inbox, CheckCircle, Phone, Shield, Activity, Database, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import StatsCard from '../components/dashboard/StatsCard';
import RecentMessages from '../components/dashboard/RecentMessages';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('sb-access-token');
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  // If admin, show admin dashboard
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Regular user dashboard
  return <UserDashboard />;
}

// ============================================================================
// ADMIN DASHBOARD - Analytics and System Overview
// ============================================================================
function AdminDashboard() {
  const { data: messages = [] } = useQuery({
    queryKey: ['allMessages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: chatrooms = [] } = useQuery({
    queryKey: ['allChatrooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: senderNumbers = [] } = useQuery({
    queryKey: ['allSenderNumbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sender_numbers')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate stats
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const messages24h = messages.filter(m => new Date(m.created_at) > last24h).length;
  const messages7d = messages.filter(m => new Date(m.created_at) > last7d).length;
  const activeUsers = users.filter(u => u.role !== 'admin' && u.is_approved).length;
  const activeChatrooms = chatrooms.filter(c => c.is_active).length;
  const deliveryRate = messages.length > 0
    ? ((messages.filter(m => m.status === 'delivered').length / messages.length) * 100).toFixed(1)
    : 0;

  // Hourly activity for last 24 hours
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hourStart = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    
    const hourMessages = messages.filter(m => {
      const msgTime = new Date(m.created_at);
      return msgTime >= hourStart && msgTime < hourEnd;
    });
    
    return {
      hour: hourStart.getHours() + ':00',
      messages: hourMessages.length
    };
  });

  // Provider distribution
  const providerData = [
    { name: 'Twilio', value: senderNumbers.filter(n => n.type === 'phone').length, color: '#3b82f6' },
    { name: 'Email', value: messages.filter(m => m.type === 'email').length, color: '#8b5cf6' },
    { name: 'Viber', value: 0, color: '#7c3aed' },
    { name: 'WhatsApp', value: 0, color: '#10b981' }
  ].filter(p => p.value > 0);

  // Top active users
  const userActivity = users
    .filter(u => u.role !== 'admin')
    .map(u => ({
      name: u.name || u.email,
      messages: messages.filter(m => m.user_id === u.id).length
    }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 5);

  // Daily messages for last 7 days
  const dailyMessages = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    
    const dayMessages = messages.filter(m => {
      const msgDate = new Date(m.created_at);
      return msgDate >= date && msgDate < nextDate;
    });
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: dayMessages.length,
      delivered: dayMessages.filter(m => m.status === 'delivered').length,
      failed: dayMessages.filter(m => m.status === 'failed').length
    };
  });

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">System overview and analytics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg border border-purple-200">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">Administrator</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-lg border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages (24h)</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{messages24h}</p>
                <p className="text-xs text-gray-500 mt-1">{messages7d} in last 7 days</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activeUsers}</p>
                <p className="text-xs text-gray-500 mt-1">{users.length} total</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chatrooms</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activeChatrooms}</p>
                <p className="text-xs text-gray-500 mt-1">{chatrooms.length} total</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-l-indigo-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sender Numbers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{senderNumbers.length}</p>
                <p className="text-xs text-gray-500 mt-1">{senderNumbers.filter(n => n.is_active).length} active</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Phone className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivery Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{deliveryRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Last 1000 messages</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <CheckCircle className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Activity */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Hourly Activity (Last 24 Hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="messages" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMessages)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" />
              Message Distribution by Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={providerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {providerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              7-Day Message Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyMessages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total" />
                <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Active Users */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Top 5 Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="messages" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <RecentMessages messages={messages.slice(0, 10)} />
    </div>
  );
}

// ============================================================================
// USER DASHBOARD - Regular User View
// ============================================================================
function UserDashboard() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['userMessages', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['userContacts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const { data: chatrooms = [] } = useQuery({
    queryKey: ['userChatrooms', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_chatrooms')
        .select('chatroom_id, chatrooms(id, name)')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const { data: inboundMessages = [] } = useQuery({
    queryKey: ['userInboundMessages', userId],
    queryFn: async () => {
      if (!userId) return [];
      // Get user's chatroom IDs
      const { data: userChatroomData, error: chatroomError } = await supabase
        .from('user_chatrooms')
        .select('chatroom_id')
        .eq('user_id', userId);
      
      if (chatroomError || !userChatroomData) return [];
      
      const chatroomIds = userChatroomData.map(uc => uc.chatroom_id);
      
      if (chatroomIds.length === 0) return [];
      
      // Get inbound messages for those chatrooms
      const { data, error } = await supabase
        .from('inbound_messages')
        .select('*')
        .in('chatroom_id', chatroomIds)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const stats = {
    totalSent: messages.length,
    totalDelivered: messages.filter(m => m.status === 'delivered').length,
    totalContacts: contacts.length,
    totalInbound: inboundMessages.length,
    totalChatrooms: chatrooms.length,
    deliveryRate: messages.length > 0
      ? ((messages.filter(m => m.status === 'delivered').length / messages.length) * 100).toFixed(1)
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
      {/* User Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your messaging overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="Messages Sent"
          value={stats.totalSent}
          icon={Send}
          color="blue"
        />
        <StatsCard
          title="Delivered"
          value={stats.totalDelivered}
          icon={CheckCircle}
          color="green"
          trend={`${stats.deliveryRate}% rate`}
        />
        <StatsCard
          title="My Contacts"
          value={stats.totalContacts}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Chatrooms"
          value={stats.totalChatrooms}
          icon={MessageSquare}
          color="indigo"
        />
        <StatsCard
          title="Inbox"
          value={stats.totalInbound}
          icon={Inbox}
          color="amber"
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
