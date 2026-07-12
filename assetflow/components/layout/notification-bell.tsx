"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function NotificationBell() {
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Welcome to AssetFlow", time: "Just now", unread: true },
    { id: 2, title: "Database seeded successfully", time: "2 hours ago", unread: false }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md relative text-muted-foreground hover:bg-white/10 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 h-2 w-2 bg-primary rounded-full animate-pulse" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass-card border-white/10 mt-1">
        <div className="flex justify-between items-center px-3 py-2">
          <span className="font-semibold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span onClick={markAllRead} className="text-xs text-primary cursor-pointer hover:underline">
              Mark all as read
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 cursor-pointer hover:bg-white/5 focus:bg-white/5">
                <div className="flex items-center justify-between w-full">
                  <span className={`text-sm ${n.unread ? "font-semibold text-white" : "text-muted-foreground"}`}>{n.title}</span>
                  {n.unread && <span className="h-2 w-2 bg-primary rounded-full" />}
                </div>
                <span className="text-xs text-muted-foreground mt-1">{n.time}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
