import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { ReactNode } from "react";

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Server Component to conditionally render content based on user role.
 * Ensures the markup is never sent to the client if the user lacks the required role.
 */
export async function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const session = await auth();
  
  if (!session?.user?.role) {
    return <>{fallback}</>;
  }
  
  const hasRole = roles.includes(session.user.role as UserRole);
  
  if (!hasRole) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
