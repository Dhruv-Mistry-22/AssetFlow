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
import { Package, Search, Filter } from "lucide-react";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <Package className="mr-3 h-8 w-8 text-primary" />
            Asset Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage, search, and register all organizational assets.
          </p>
        </div>
        <div className="flex space-x-3">
          <ExportAssetsButton assets={assets} />
          <RegisterAssetModal categories={categories} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <SearchInput placeholder="Search by tag, name, or serial number..." />
        <Button variant="outline" className="border-white/10 bg-background/50">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Glassmorphic Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-semibold text-zinc-300">Asset Tag</TableHead>
              <TableHead className="font-semibold text-zinc-300">Name</TableHead>
              <TableHead className="font-semibold text-zinc-300">Category</TableHead>
              <TableHead className="font-semibold text-zinc-300">Status</TableHead>
              <TableHead className="font-semibold text-zinc-300 hidden md:table-cell">Location</TableHead>
              <TableHead className="font-semibold text-zinc-300 text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  No assets found. Register one above to get started.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id} className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                  <TableCell className="font-mono text-primary font-medium flex items-center gap-2">
                    {asset.assetTag}
                    <QrCodeButton assetTag={asset.assetTag} assetName={asset.name} />
                  </TableCell>
                  <TableCell className="font-medium text-white">{asset.name}</TableCell>
                  <TableCell className="text-muted-foreground">{asset.category.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      asset.status === "AVAILABLE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      asset.status === "ALLOCATED" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      asset.status === "UNDER_MAINTENANCE" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }>
                      {asset.status.replace("_", " ")}
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
