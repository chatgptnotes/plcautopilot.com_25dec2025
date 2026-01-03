'use client';

export default function AdminAnalytics() {
  const usageData = [
    { label: 'PLC Programs Generated', value: 156, change: '+12%', positive: true },
    { label: 'API Calls', value: '2.4K', change: '+8%', positive: true },
    { label: 'Active Users', value: 2, change: '0%', positive: true },
    { label: 'Error Rate', value: '0.5%', change: '-2%', positive: true },
  ];

  const platformUsage = [
    { platform: 'Schneider M221', usage: 45, color: 'bg-green-500' },
    { platform: 'Schneider M241', usage: 25, color: 'bg-blue-500' },
    { platform: 'Siemens S7', usage: 15, color: 'bg-purple-500' },
    { platform: 'Rockwell', usage: 10, color: 'bg-orange-500' },
    { platform: 'Other', usage: 5, color: 'bg-gray-500' },
  ];

  const recentPrograms = [
    { name: 'Motor Start/Stop', platform: 'M221', user: 'Demo User', date: '2025-01-03' },
    { name: 'Tank Level Control', platform: 'M241', user: 'Admin', date: '2025-01-02' },
    { name: 'Conveyor System', platform: 'S7-1200', user: 'Demo User', date: '2025-01-01' },
    { name: 'Temperature Monitor', platform: 'M221', user: 'Admin', date: '2024-12-31' },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor system usage and performance</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>All time</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
            <span className="material-icons text-sm">download</span>
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {usageData.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <span className={`text-sm font-medium ${
                stat.positive ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform Usage */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Platform Usage</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {platformUsage.map((platform) => (
                <div key={platform.platform}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{platform.platform}</span>
                    <span className="text-sm font-medium text-gray-900">{platform.usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${platform.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${platform.usage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Daily Activity</h2>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center">
                <span className="material-icons text-4xl text-gray-300">bar_chart</span>
                <p className="text-gray-500 mt-2">Chart visualization</p>
                <p className="text-xs text-gray-400">Connect to analytics service for live data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Programs */}
        <div className="bg-white rounded-lg shadow-sm lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recently Generated Programs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentPrograms.map((program, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{program.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {program.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{program.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{program.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-8 bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-4xl font-bold text-green-600">2.3s</p>
              <p className="text-sm text-gray-500 mt-1">Avg. Generation Time</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-4xl font-bold text-blue-600">99.9%</p>
              <p className="text-sm text-gray-500 mt-1">Uptime</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-4xl font-bold text-purple-600">156ms</p>
              <p className="text-sm text-gray-500 mt-1">Avg. API Response</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
