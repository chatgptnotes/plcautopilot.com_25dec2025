'use client';

import { useAuth } from '@/app/context/AuthContext';
import { UserRole } from '@/lib/auth';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * RoleGate component - conditionally renders children based on user role
 *
 * Usage:
 * <RoleGate allowedRoles={['admin']}>
 *   <AdminOnlyContent />
 * </RoleGate>
 *
 * With fallback:
 * <RoleGate allowedRoles={['admin']} fallback={<p>Access denied</p>}>
 *   <AdminOnlyContent />
 * </RoleGate>
 */
export default function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { user, isLoading } = useAuth();

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Check if user has required role
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
