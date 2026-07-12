import { db } from "@/lib/db";
import { ReportIssueModal } from "@/components/maintenance/report-issue-modal";
import { MaintenanceKanban } from "@/components/maintenance/kanban-board";
import { auth } from "@/auth";

export const metadata = {
  title: "Maintenance - AssetFlow",
};

export default async function MaintenancePage() {
  const session = await auth();
  const userRole = session?.user?.role || "EMPLOYEE";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Maintenance & repairs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage hardware repairs and software issues.
          </p>
        </div>
        <div>
          <ReportIssueModal assets={allAssets} />
        </div>
      </div>

      {/* Kanban Board */}
      <MaintenanceKanban tickets={tickets} userRole={userRole} />
    </div>
  );
}
