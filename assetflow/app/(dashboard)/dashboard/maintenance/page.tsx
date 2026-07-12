import { db } from "@/lib/db";
import { ReportIssueModal } from "@/components/maintenance/report-issue-modal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wrench, Search, AlertCircle, MessageSquareWarning } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function MaintenancePage() {
  const tickets = await db.maintenanceRequest.findMany({
    include: { 
      asset: { select: { name: true, assetTag: true } },
      requestedByUser: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  const allAssets = await db.asset.findMany({
    select: { id: true, name: true, assetTag: true },
    orderBy: { assetTag: "asc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <Wrench className="mr-3 h-8 w-8 text-orange-500" />
            Maintenance & Repairs
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage hardware repairs and software issues.
          </p>
        </div>
        <div>
          <ReportIssueModal assets={allAssets} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tickets by ID, asset, or person..."
            className="pl-9 bg-background/50 border-white/10 focus-visible:ring-orange-500/50"
          />
        </div>
      </div>

      {/* Glassmorphic Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-semibold text-zinc-300">Ticket ID</TableHead>
              <TableHead className="font-semibold text-zinc-300">Asset</TableHead>
              <TableHead className="font-semibold text-zinc-300">Reported By</TableHead>
              <TableHead className="font-semibold text-zinc-300">Priority</TableHead>
              <TableHead className="font-semibold text-zinc-300">Status</TableHead>
              <TableHead className="font-semibold text-zinc-300 hidden md:table-cell text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    No maintenance tickets found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {ticket.id.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {ticket.asset.assetTag} - {ticket.asset.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ticket.requestedByUser.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      ticket.priority === "CRITICAL" ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse" :
                      ticket.priority === "HIGH" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                      ticket.priority === "MEDIUM" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }>
                      {ticket.priority === "CRITICAL" && <MessageSquareWarning className="h-3 w-3 mr-1" />}
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      ticket.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                      ticket.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      ticket.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell text-right">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
