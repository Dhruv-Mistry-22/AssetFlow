import { db } from "@/lib/db";
import { RequireRole } from "@/components/auth/require-role";
import { AllocationForm } from "@/components/allocations/allocation-form";

export const metadata = {
  title: "New Allocation - AssetFlow",
};

export default async function NewAllocationPage() {
  // Fetch all assets that are typically allocatable. 
  // The form will default to showing only AVAILABLE, but can show others to demonstrate the 409 conflict modal.
  const assets = await db.asset.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      assetTag: true,
      status: true,
    }
  });

  const users = await db.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
    }
  });

  return (
    <RequireRole
      roles={["ADMIN", "ASSET_MANAGER"]}
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-2 text-center">
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            Only Asset Managers and Administrators can allocate assets.
          </p>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Allocate asset</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign an asset to an employee or department.
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <AllocationForm assets={assets} users={users} />
        </div>
      </div>
    </RequireRole>
  );
}
