import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  Send,
  Mail,
  Inbox,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  MessageSquare,
  Shield,
  Phone,
  Bell,
  LogOut,
  ChevronDown,
  Database
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const currentPath = router.pathname;

  useEffect(() => {
    // Fetch authenticated user
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('sb-access-token');
        
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          // Not authenticated - redirect to login
          if (currentPath !== '/Login' && currentPath !== '/Home' && currentPath !== '/' && currentPath !== '/Signup') {
            router.push('/Login');
          }
          setUser(null);
          setLoading(false);
          return;
        }

        const userData = await response.json();
        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        if (currentPath !== '/Login' && currentPath !== '/Home' && currentPath !== '/' && currentPath !== '/Signup') {
          router.push('/Login');
        }
        setUser(null);
        setLoading(false);
      }
    };

    fetchUser();
  }, [currentPath, router]);

  // Don't apply layout to Home page, Login page, or Signup page
  if (currentPath === '/Home' || currentPath === '/' || currentPath === '/Login' || currentPath === '/Signup') {
    return <>{children}</>;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return null;
  }

  const isAdmin = user?.role === 'admin';

  // User navigation - for agents/regular users
  const userNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/Dashboard' },
    { name: 'Resources', icon: Database, href: '/Resources' },
    { name: 'Chatroom', icon: Phone, href: '/Chatroom' },
    { name: 'Settings', icon: Settings, href: '/Settings' },
  ];

  // Admin navigation - ONLY admin features
  const adminNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/Dashboard' },
    { name: 'Users', icon: Shield, href: '/admin/AdminUsers' },
    { name: 'API Providers', icon: Database, href: '/admin/AdminProviders' },
    { name: 'Chatrooms', icon: MessageSquare, href: '/admin/AdminChatrooms' },
    { name: 'Resource Pool', icon: Database, href: '/admin/AdminResourcePool' },
    { name: 'Sender Numbers', icon: Phone, href: '/admin/AdminSenderNumbers' },
    { name: 'Message Logs', icon: MessageSquare, href: '/admin/AdminMessageLogs' },
    { name: 'Chatroom Access', icon: Shield, href: '/admin/AdminChatroomAccess' },
    { name: 'System Settings', icon: Settings, href: '/admin/AdminSettings' },
  ];

  // Choose navigation based on role
  const navigation = isAdmin ? adminNavigation : userNavigation;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('sb-access-token');
      setUser(null);
      router.push('/Login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout anyway
      localStorage.removeItem('sb-access-token');
      setUser(null);
      router.push('/Login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MessageHub</h1>
                <p className="text-xs text-gray-500">Communication Platform</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User menu */}
          {user && (
            <div className="border-t p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/Settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Only show title for non-admin pages */}
            {!currentPath.startsWith('/admin/') && (
              <div className="flex-1 lg:flex-none">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentPath.split('/').pop()?.replace(/([A-Z])/g, ' $1').trim() || 'Dashboard'}
                </h2>
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
