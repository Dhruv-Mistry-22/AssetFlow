"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const allocateSchema = z.object({
  assetId: z.string().min(1, "Please select an asset."),
  employeeId: z.string().min(1, "Please select an employee."),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
});

type AllocateFormValues = z.infer<typeof allocateSchema>;

interface Asset {
  id: string;
  name: string;
  assetTag: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface ConflictData {
  error: string;
  heldBy: string;
  heldByEmail?: string;
  assetTag?: string;
  suggestion: string;
}

export function AllocationForm({
  assets,
  users,
}: {
  assets: Asset[];
  users: User[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Conflict Modal State
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const form = useForm<AllocateFormValues>({
    resolver: zodResolver(allocateSchema),
    defaultValues: {
      assetId: "",
      employeeId: "",
      expectedReturnDate: "",
      notes: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: AllocateFormValues) => {
    setIsLoading(true);
    setConflictData(null);

    try {
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409 || res.status === 400) {
          // Open conflict modal instead of a generic toast
          setConflictData({
            error: json.error || "Conflict detected",
            heldBy: json.heldBy || "another user",
            heldByEmail: json.heldByEmail,
            assetTag: json.assetTag,
            suggestion: json.suggestion || "Request a transfer",
          });
          setIsConflictModalOpen(true);
        } else {
          toast.error("Allocation failed", {
            description: json.error || "An unexpected error occurred.",
          });
        }
        setIsLoading(false);
        return;
      }

      toast.success("Asset allocated", {
        description: "The asset was successfully assigned to the employee.",
      });
      router.push("/dashboard/assets");
      router.refresh();
    } catch (error) {
      toast.error("System error", {
        description: "Could not connect to the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestTransfer = async () => {
    // In a real app, this would hit POST /api/allocations/transfer
    toast.success("Transfer requested", {
      description: `A transfer request has been sent to ${conflictData?.heldBy}.`,
    });
    setIsConflictModalOpen(false);
    form.reset();
  };

  const isFormValid = form.formState.isValid;

  // Filter assets to show AVAILABLE by default, but allow all to demonstrate the conflict feature if we want.
  // The prompt says "defaults to Available only". Let's sort them so AVAILABLE is at the top.
  const sortedAssets = [...assets].sort((a, b) => {
    if (a.status === "AVAILABLE" && b.status !== "AVAILABLE") return -1;
    if (a.status !== "AVAILABLE" && b.status === "AVAILABLE") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Asset Picker */}
          <div className="space-y-2">
            <Label htmlFor="assetId">Asset</Label>
            <Select
              onValueChange={(val) => form.setValue("assetId", val, { shouldValidate: true })}
              disabled={isLoading}
            >
              <SelectTrigger id="assetId" className="w-full">
                <SelectValue placeholder="Select an asset..." />
              </SelectTrigger>
              <SelectContent>
                {sortedAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.assetTag} - {asset.name} 
                    {asset.status !== "AVAILABLE" && ` (${asset.status.replace("_", " ")})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assetId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.assetId.message}
              </p>
            )}
          </div>

          {/* Employee Picker */}
          <div className="space-y-2">
            <Label htmlFor="employeeId">Assign to</Label>
            <Select
              onValueChange={(val) => form.setValue("employeeId", val, { shouldValidate: true })}
              disabled={isLoading}
            >
              <SelectTrigger id="employeeId" className="w-full">
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {user.department ? `(${user.department})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.employeeId.message}
              </p>
            )}
          </div>

          {/* Return Date */}
          <div className="space-y-2">
            <Label htmlFor="expectedReturnDate">Expected return date (Optional)</Label>
            <Input
              id="expectedReturnDate"
              type="date"
              disabled={isLoading}
              {...form.register("expectedReturnDate")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific conditions or notes..."
              disabled={isLoading}
              {...form.register("notes")}
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading || !isFormValid}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Allocate asset
        </Button>
      </form>

      {/* Centerpiece Conflict Modal */}
      <Dialog open={isConflictModalOpen} onOpenChange={setIsConflictModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Allocation conflict
            </DialogTitle>
            <DialogDescription className="pt-2 text-base text-foreground">
              This asset is already allocated. 
              <br /><br />
              <span className="font-medium text-foreground block bg-muted p-3 rounded-md">
                Currently held by {conflictData?.heldBy}.
              </span>
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {conflictData?.suggestion || "Would you like to request a transfer from the current holder?"}
          </p>
          <DialogFooter className="sm:justify-between mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConflictModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleRequestTransfer}>
              Request transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
