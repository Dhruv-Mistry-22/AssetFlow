"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  CalendarClock, 
  Wrench, 
  ClipboardCheck, 
  Users,
  Server,
  Inbox
} from "lucide-react";
import { useSession } from "next-auth/react";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Asset directory",
    icon: Package,
    href: "/dashboard/assets",
  },
  {
    label: "Bookings",
    icon: CalendarClock,
    href: "/dashboard/bookings",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    href: "/dashboard/maintenance",
  },
  {
    label: "Audits",
    icon: ClipboardCheck,
    href: "/dashboard/audits",
    roles: ["ADMIN", "ASSET_MANAGER"],
  },
  {
    label: "Directory",
    icon: Users,
    href: "/dashboard/directory",
  },
  {
    label: "Organization setup",
    icon: Inbox,
    href: "/dashboard/organization",
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "EMPLOYEE";

  const visibleRoutes = routes.filter((route) => {
    if (!route.roles) return true;
    return route.roles.includes(userRole);
  });

  return (
    <div className="flex h-full flex-col bg-card py-4 text-foreground">
      <div className="flex-1 px-3 py-2">
        <Link href="/dashboard" className="mb-8 flex items-center pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Server className="h-4 w-4" />
          </div>
          <h1 className="ml-3 text-lg font-semibold tracking-tight">
            AssetFlow
          </h1>
        </Link>
        <nav className="space-y-1">
          {visibleRoutes.map((route) => (
            <Link href={route.href} key={route.href}>
              <span
                className={cn(
                  "group flex w-full cursor-pointer items-center justify-start rounded-md p-2 text-sm font-medium transition-colors",
                  pathname === route.href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <route.icon className="mr-3 h-4 w-4" />
                {route.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
