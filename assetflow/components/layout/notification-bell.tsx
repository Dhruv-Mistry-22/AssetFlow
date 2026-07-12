"use client";

import { Bell, Package, CalendarClock, Wrench, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "ASSET_ALLOCATED":
      case "ASSET_RETURNED":
        return <Package className="h-4 w-4 text-emerald-500" />;
      case "BOOKING_CREATED":
      case "BOOKING_CANCELLED":
        return <CalendarClock className="h-4 w-4 text-blue-500" />;
      case "MAINTENANCE_LOGGED":
      case "MAINTENANCE_UPDATED":
        return <Wrench className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md relative text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 h-2 w-2 bg-primary rounded-full animate-pulse" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 mt-1">
        <div className="flex justify-between items-center px-3 py-2">
          <span className="font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[350px] overflow-y-auto py-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex items-start gap-3 p-3 cursor-pointer">
                <div className="mt-1">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-sm ${!n.read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                      {n.title}
                    </span>
                    {!n.read && <span className="h-2 w-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
