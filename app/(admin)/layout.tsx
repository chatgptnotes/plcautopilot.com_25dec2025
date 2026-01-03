'use client';

import AdminSidebar from '../components/AdminSidebar';
import AuthGuard from '../components/AuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredRole="admin">
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex-1 lg:ml-0">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
