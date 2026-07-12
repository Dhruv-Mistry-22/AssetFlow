"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Wrench, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const maintenanceSchema = z.object({
  assetId: z.string().min(1, "Please select an asset"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(10, "Please provide a detailed description (min 10 chars)"),
});

type FormValues = z.infer<typeof maintenanceSchema>;

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

export function ReportIssueModal({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const form = useForm<FormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      assetId: "",
      priority: "MEDIUM",
      description: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          requestedByUserId: session?.user?.id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit ticket");
      }

      toast.success("Maintenance Ticket Raised", {
        description: data.priority === "CRITICAL" 
          ? "CRITICAL ALERT fired to Corporate Chat Webhook!" 
          : "IT Support has been notified.",
      });
      
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Submission Failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-105">
        <Wrench className="mr-2 h-4 w-4" /> Report Issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl text-orange-500 flex items-center">
            <Wrench className="mr-2 h-5 w-5" /> Report Asset Issue
          </DialogTitle>
          <DialogDescription>
            Raise a maintenance ticket for a damaged or malfunctioning asset.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">Affected Asset</Label>
            <Select onValueChange={(val) => form.setValue("assetId", val)}>
              <SelectTrigger className="bg-background/50 border-white/10 focus-visible:ring-orange-500/50">
                <SelectValue placeholder="Search or select an asset" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.assetTag} - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assetId && (
              <p className="text-xs text-destructive">{form.formState.errors.assetId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level</Label>
            <Select onValueChange={(val: any) => form.setValue("priority", val)} defaultValue="MEDIUM">
              <SelectTrigger className="bg-background/50 border-white/10 focus-visible:ring-orange-500/50">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="LOW">Low (Cosmetic/Minor)</SelectItem>
                <SelectItem value="MEDIUM">Medium (Degraded functionality)</SelectItem>
                <SelectItem value="HIGH">High (Major functionality broken)</SelectItem>
                <SelectItem value="CRITICAL" className="text-destructive font-bold">
                  Critical (Triggers Webhook Alert)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Issue Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe exactly what is wrong..."
              className="bg-background/50 border-white/10 focus-visible:ring-orange-500/50 resize-none h-24"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-500 text-white">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
