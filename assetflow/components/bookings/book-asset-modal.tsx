"use client";

import { useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const bookSchema = z.object({
  assetId: z.string().min(1, "Please select an asset."),
  startTime: z.string().min(1, "Start time is required."),
  endTime: z.string().min(1, "End time is required."),
  purpose: z.string().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["endTime"]
});

type FormValues = z.infer<typeof bookSchema>;

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

interface ExistingBooking {
  assetId: string;
  startTime: Date;
  endTime: Date;
}

export function BookAssetModal({ 
  assets, 
  existingBookings = [] 
}: { 
  assets: Asset[];
  existingBookings?: ExistingBooking[];
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      assetId: "",
      startTime: "",
      endTime: "",
      purpose: "",
    },
    mode: "onChange"
  });

  // Watch values for live overlap validation
  const watchedAssetId = useWatch({ control: form.control, name: "assetId" });
  const watchedStartTime = useWatch({ control: form.control, name: "startTime" });
  const watchedEndTime = useWatch({ control: form.control, name: "endTime" });

  // Live Overlap Validation Logic
  const overlapError = useMemo(() => {
    if (!watchedAssetId || !watchedStartTime || !watchedEndTime) return null;

    const start = new Date(watchedStartTime);
    const end = new Date(watchedEndTime);

    if (start >= end) return null; // Let zod handle start > end error

    const conflictingBooking = existingBookings.find((booking) => {
      if (booking.assetId !== watchedAssetId) return false;
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      // Check for date range overlap
      return (start < bEnd && end > bStart);
    });

    if (conflictingBooking) {
      return `Overlaps with an existing booking from ${new Date(conflictingBooking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${new Date(conflictingBooking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`;
    }

    return null;
  }, [watchedAssetId, watchedStartTime, watchedEndTime, existingBookings]);

  const onSubmit = async (data: FormValues) => {
    if (overlapError) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: data.assetId,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
          purpose: data.purpose,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to book asset.");
      }

      toast.success("Asset booked", {
        description: "Your booking has been successfully confirmed.",
      });
      
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Booking failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = form.formState.isValid && !overlapError;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          Book resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Book a resource</DialogTitle>
          <DialogDescription>
            Schedule time for a bookable asset. Our system prevents overlaps automatically.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="assetId">Resource / Asset</Label>
            <Select 
              onValueChange={(val) => form.setValue("assetId", val, { shouldValidate: true })} 
              value={form.watch("assetId")}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a bookable asset..." />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.assetTag} - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assetId && (
              <p className="text-sm text-destructive">{form.formState.errors.assetId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                disabled={isLoading}
                {...form.register("startTime")}
              />
              {form.formState.errors.startTime && (
                <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                disabled={isLoading}
                {...form.register("endTime")}
              />
              {form.formState.errors.endTime && (
                <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Live Overlap Validation Message */}
          {overlapError && (
            <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <p>{overlapError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <Input
              id="purpose"
              placeholder="e.g. Q3 Planning Meeting"
              disabled={isLoading}
              {...form.register("purpose")}
            />
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
