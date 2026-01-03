'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    { title: 'Total Users', value: '2', icon: 'people', color: 'bg-blue-500' },
    { title: 'Active Sessions', value: '1', icon: 'toggle_on', color: 'bg-green-500' },
    { title: 'System Health', value: '98%', icon: 'health_and_safety', color: 'bg-purple-500' },
    { title: 'API Calls Today', value: '156', icon: 'api', color: 'bg-orange-500' },
  ];

  const recentActivity = [
    { action: 'User logged in', user: 'admin@plcautopilot.com', time: 'Just now', type: 'login' },
    { action: 'PLC program generated', user: 'user@plcautopilot.com', time: '5 min ago', type: 'generate' },
    { action: 'Settings updated', user: 'admin@plcautopilot.com', time: '1 hour ago', type: 'settings' },
    { action: 'New user registered', user: 'user@plcautopilot.com', time: '2 hours ago', type: 'register' },
    { action: 'API key generated', user: 'admin@plcautopilot.com', time: '1 day ago', type: 'api' },
  ];

  const quickActions = [
    { title: 'Manage Users', description: 'View and manage user accounts', link: '/admin/users', icon: 'group' },
    { title: 'View Analytics', description: 'Check system usage statistics', link: '/admin/analytics', icon: 'analytics' },
    { title: 'System Settings', description: 'Configure application settings', link: '/admin/settings', icon: 'settings' },
    { title: 'Billing', description: 'Manage billing and subscriptions', link: '/billing/plan', icon: 'payment' },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Administrator'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <span className="material-icons text-white">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {recentActivity.map((activity, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'login' ? 'bg-green-500' :
                    activity.type === 'generate' ? 'bg-blue-500' :
                    activity.type === 'settings' ? 'bg-purple-500' :
                    activity.type === 'register' ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.user} - {activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.link}
                  className="p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors group"
                >
                  <span className="material-icons text-gray-400 group-hover:text-orange-500 mb-2">{action.icon}</span>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">API Server</p>
                <p className="text-xs text-gray-500">Operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Database</p>
                <p className="text-xs text-gray-500">Healthy</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">AI Services</p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
