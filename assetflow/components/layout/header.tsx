"use client";

import { Bell, Menu, Search, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Simple breadcrumb extraction
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentSegment = pathSegments[pathSegments.length - 1] || "Dashboard";
  const title = currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1);

  return (
    <div className="h-16 flex items-center p-4 bg-background/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 lg:px-8">
      {/* Mobile Sidebar Toggle */}
      <Sheet>
        <SheetTrigger className="md:hidden mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted/50 transition-colors">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 bg-background border-r-white/5 w-72">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex items-center">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        {/* Search */}
        <GlobalSearch />

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <Avatar className="h-9 w-9 border border-white/10 shadow-sm transition-transform hover:scale-105">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${session?.user?.name || "U"}`} alt="User Avatar" />
              <AvatarFallback className="bg-primary/20 text-primary">
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-1 border-white/10 glass-card" align="end">
            <div className="px-2 py-1.5 font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session?.user?.name || "Guest User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email || "Not signed in"}
                </p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-primary mt-1">
                  {session?.user?.role || "EMPLOYEE"}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5">
              <Settings className="mr-2 h-4 w-4" />
              <span>Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
