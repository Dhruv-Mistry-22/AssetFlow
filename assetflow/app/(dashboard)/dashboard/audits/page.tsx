import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AuditsPage() {
  const audits = await db.auditCycle.findMany({
    include: { 
      createdByUser: { select: { name: true } },
      _count: { select: { auditItems: true, discrepancies: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <ClipboardCheck className="mr-3 h-8 w-8 text-purple-500" />
            Audit Cycles
          </h1>
          <p className="text-muted-foreground mt-1">
            Track inventory auditing, compliance, and discrepancies.
          </p>
        </div>
        <div>
          <Button className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20">
            <Plus className="mr-2 h-4 w-4" /> Start Audit
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search audits by cycle number..."
            className="pl-9 bg-background/50 border-white/10 focus-visible:ring-purple-500/50"
          />
        </div>
      </div>

      {/* Glassmorphic Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-semibold text-zinc-300">Cycle ID</TableHead>
              <TableHead className="font-semibold text-zinc-300">Scope</TableHead>
              <TableHead className="font-semibold text-zinc-300">Started By</TableHead>
              <TableHead className="font-semibold text-zinc-300">Start Date</TableHead>
              <TableHead className="font-semibold text-zinc-300">Status</TableHead>
              <TableHead className="font-semibold text-zinc-300 text-right">Items / Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  No audits found.
                </TableCell>
              </TableRow>
            ) : (
              audits.map((audit) => (
                <TableRow key={audit.id} className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                  <TableCell className="font-mono text-primary font-medium">{audit.cycleNumber}</TableCell>
                  <TableCell className="font-medium text-white">{audit.scope}</TableCell>
                  <TableCell className="text-muted-foreground">{audit.createdByUser.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(audit.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      audit.status === "CREATED" ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" :
                      audit.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse" :
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }>
                      {audit.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    <span className="text-emerald-500">{audit._count.auditItems}</span>
                    <span className="mx-1">/</span>
                    <span className={audit._count.discrepancies > 0 ? "text-destructive" : "text-zinc-500"}>
                      {audit._count.discrepancies}
                    </span>
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
