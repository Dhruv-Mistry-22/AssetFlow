"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";

export function ExportAssetsButton({ assets }: { assets: any[] }) {
  const handleExport = () => {
    const data = assets.map(a => ({
      "Asset Tag": a.assetTag,
      "Name": a.name,
      "Category": a.category?.name || "",
      "Status": a.status,
      "Location": a.location || "",
      "Acquisition Cost": a.acquisitionCost,
      "Added On": new Date(a.createdAt).toLocaleDateString()
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "asset_inventory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleExport} variant="outline" className="border-white/10 bg-background/50 hover:bg-white/10 transition-colors">
      <Download className="mr-2 h-4 w-4" /> Export CSV
    </Button>
  );
}
