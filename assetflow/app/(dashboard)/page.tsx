"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/dashboard/kpis")
        .then((res) => res.json())
        .then((data) => {
          setKpis(data);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-available">
              {kpis?.assets?.available || 0}
            </div>
            <p className="text-xs text-muted-foreground">Ready for allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-allocated">
              {kpis?.assets?.allocated || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-maintenance">
              {kpis?.assets?.underMaintenance || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Overdue returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {kpis?.alerts?.overdueReturns || 0}
            </div>
            <p className="text-xs text-destructive/80">Immediate action required</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
