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
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-primary",
  },
  {
    label: "Asset Directory",
    icon: Package,
    href: "/dashboard/assets",
    color: "text-blue-500",
  },
  {
    label: "Bookings",
    icon: CalendarClock,
    href: "/dashboard/bookings",
    color: "text-emerald-500",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    href: "/dashboard/maintenance",
    color: "text-orange-500",
  },
  {
    label: "Audits",
    icon: ClipboardCheck,
    href: "/dashboard/audits",
    color: "text-purple-500",
    roles: ["ADMIN", "ASSET_MANAGER"],
  },
  {
    label: "Directory",
    icon: Users,
    href: "/dashboard/directory",
    color: "text-muted-foreground",
  },
  {
    label: "Access Requests",
    icon: Inbox,
    href: "/dashboard/requests",
    color: "text-rose-500",
    roles: ["ADMIN"], // Only admins can see Access Requests
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || "EMPLOYEE";

  // Filter routes based on user role
  const visibleRoutes = routes.filter((route) => {
    if (!route.roles) return true; // Visible to everyone
    return route.roles.includes(userRole);
  });

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-background/80 backdrop-blur-md border-r border-white/5 shadow-xl text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-10 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Server className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold ml-3 tracking-tight">
            AssetFlow
          </h1>
        </Link>
        <div className="space-y-1">
          {visibleRoutes.map((route) => (
            <Link
              href={route.href}
              key={route.href}
            >
              <span className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/5 rounded-lg transition-all",
                pathname === route.href ? "bg-white/10 text-white shadow-sm" : "text-zinc-400"
              )}>
                <div className="flex items-center flex-1">
                  <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                  {route.label}
                </div>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="glass-card p-4 rounded-xl relative overflow-hidden text-center space-y-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <h3 className="text-sm font-semibold">Need Help?</h3>
          <p className="text-xs text-muted-foreground">Check the documentation or contact IT support.</p>
          <Button size="sm" variant="outline" className="w-full mt-2 bg-background/50 border-white/10 text-xs">
            Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}
