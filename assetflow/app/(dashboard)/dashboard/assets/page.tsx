import { db } from "@/lib/db";
import { SearchInput } from "@/components/ui/search-input";
import { RegisterAssetModal } from "@/components/assets/register-asset-modal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExportAssetsButton } from "@/components/assets/export-assets-button";
import { QrCodeButton } from "@/components/assets/qr-code-button";

export default async function AssetsDirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params?.q || "";

  const assets = await db.asset.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { assetTag: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
      ]
    } : undefined,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const categories = await db.assetCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Asset directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, search, and register organizational assets.
          </p>
        </div>
        <div className="flex space-x-2">
          <ExportAssetsButton assets={assets} />
          <RegisterAssetModal categories={categories} />
          <Button asChild>
            <a href="/dashboard/allocations/new">Allocate asset</a>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <div className="w-full max-w-sm">
          <SearchInput placeholder="Search by tag, name, or serial number" />
        </div>
        <Button variant="outline">
          Filters
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Asset tag</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="text-right">Added date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="font-medium text-foreground">No assets found</p>
                    <p className="text-sm text-muted-foreground">
                      We couldn't find any assets matching your search criteria. Register a new asset to get started.
                    </p>
                    <div className="mt-2">
                      <RegisterAssetModal categories={categories} />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id} className="cursor-pointer">
                  <TableCell className="font-mono text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {asset.assetTag}
                      <QrCodeButton assetTag={asset.assetTag} assetName={asset.name} />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell className="text-muted-foreground">{asset.category.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        asset.status === "AVAILABLE" ? "bg-status-available/10 text-status-available border-status-available/20" :
                        asset.status === "ALLOCATED" ? "bg-status-allocated/10 text-status-allocated border-status-allocated/20" :
                        asset.status === "UNDER_MAINTENANCE" ? "bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20" :
                        asset.status === "LOST" ? "bg-status-lost/10 text-status-lost border-status-lost/20" :
                        "bg-status-retired/10 text-status-retired border-status-retired/20"
                      }
                    >
                      {asset.status === "UNDER_MAINTENANCE" ? "Maintenance" : asset.status.charAt(0) + asset.status.slice(1).toLowerCase().replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{asset.location || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {new Date(asset.createdAt).toLocaleDateString()}
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
