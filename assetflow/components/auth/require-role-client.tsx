"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import { ReactNode } from "react";

interface RequireRoleClientProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Client Component to conditionally render content based on user role.
 */
export function RequireRoleClient({ roles, children, fallback = null }: RequireRoleClientProps) {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return null; // Or a skeleton if we want to get fancy, but null is safer to avoid layout shift pop
  }
  
  if (!session?.user?.role) {
    return <>{fallback}</>;
  }
  
  const hasRole = roles.includes(session.user.role as UserRole);
  
  if (!hasRole) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
