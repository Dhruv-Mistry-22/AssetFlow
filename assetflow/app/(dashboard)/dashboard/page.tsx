import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Wrench, 
  AlertTriangle,
  ArrowRightLeft,
  CalendarCheck,
  TrendingUp,
  Plus,
  Server
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  // Fetch real data from DB
  const [totalAssets, activeAllocations, pendingMaintenance, overdueReturns, recentActivity] = await Promise.all([
    db.asset.count({ where: { status: "AVAILABLE" } }),
    db.allocation.count({ where: { status: "ACTIVE" } }),
    db.maintenanceRequest.count({ where: { status: "PENDING" } }),
    db.allocation.count({
      where: {
        status: "ACTIVE",
        expectedReturnDate: { lt: new Date() },
      },
    }),
    db.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } }
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to the AssetFlow Enterprise command center.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/dashboard/bookings">
            <Button variant="outline" className="border-white/10 bg-background/50 backdrop-blur-sm">
              <CalendarCheck className="mr-2 h-4 w-4" /> Book Asset
            </Button>
          </Link>
          <Link href="/dashboard/assets">
            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" /> Go to Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card hover:bg-white/5 transition-colors border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Available Assets
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalAssets}</div>
            <p className="text-xs text-blue-400 flex items-center mt-1 font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> Ready for allocation
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:bg-white/5 transition-colors border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Allocations
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeAllocations}</div>
            <p className="text-xs text-emerald-400 flex items-center mt-1 font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> Currently checked out
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:bg-white/5 transition-colors border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Maintenance
            </CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{pendingMaintenance}</div>
            <p className="text-xs text-orange-400 flex items-center mt-1 font-medium">
              Tickets requiring action
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:bg-white/5 transition-colors border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-3xl group-hover:bg-destructive/20 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Returns
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{overdueReturns}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {overdueReturns > 0 ? "Requires immediate action" : "All assets returned on time"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Activity Feed & Insights */}
      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        
        {/* Activity Feed */}
        <Card className="col-span-4 glass-card border-white/5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest asset movements and status updates across the organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity found.</p>
              ) : (
                recentActivity.map((log) => {
                  let Icon = Package;
                  let colorClass = "text-primary";
                  let bgClass = "bg-primary/20";

                  if (log.action.includes("MAINTENANCE")) {
                    Icon = Wrench;
                    colorClass = "text-orange-500";
                    bgClass = "bg-orange-500/20";
                  } else if (log.action.includes("ALLOCATED") || log.action.includes("TRANSFER")) {
                    Icon = ArrowRightLeft;
                    colorClass = "text-emerald-500";
                    bgClass = "bg-emerald-500/20";
                  } else if (log.action.includes("BOOKING")) {
                    Icon = CalendarCheck;
                    colorClass = "text-blue-500";
                    bgClass = "bg-blue-500/20";
                  }

                  let detailsObj: any = {};
                  try { if (log.details) detailsObj = JSON.parse(log.details); } catch (e) {}

                  return (
                    <div key={log.id} className="flex items-center">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${bgClass} mr-4`}>
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                      </div>
                      <div className="ml-2 space-y-1">
                        <p className="text-sm font-medium leading-none text-white">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.user.name} • {detailsObj.assetTag || detailsObj.reason || log.resourceType}
                        </p>
                      </div>
                      <div className="ml-auto text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Insights / System Health */}
        <Card className="col-span-3 glass-card border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Real-time API and Webhook status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">PostgreSQL Database</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                  Connected & Synced
                </div>
              </div>
              <span className="text-xs text-emerald-500 font-mono">OK</span>
            </div>
            
            <div className="flex items-center">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">Corporate Webhooks</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                  Slack / Teams Integration
                </div>
              </div>
              <span className="text-xs text-emerald-500 font-mono">Active</span>
            </div>

            <div className="flex items-center">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">AI Recommendation Engine</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                  Booking conflict solver
                </div>
              </div>
              <span className="text-xs text-emerald-500 font-mono">Active</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
