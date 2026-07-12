"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, Loader2, Sparkles, ArrowRight } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

const bookSchema = z.object({
  assetId: z.string().min(1, "Please select an asset"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  purpose: z.string().optional(),
});

type FormValues = z.infer<typeof bookSchema>;

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

export function BookAssetModal({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      assetId: "",
      startTime: "",
      endTime: "",
      purpose: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setRecommendations(null); // Clear previous recommendations
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
        
        // Handle Smart AI Recommendations on 409 Conflict
        if (res.status === 409 && error.recommendations) {
          setRecommendations(error.recommendations);
          toast.error("Booking Conflict", {
            description: error.error,
          });
          return;
        }
        
        throw new Error(error.error || "Failed to book asset");
      }

      toast.success("Asset Booked", {
        description: "Your booking has been successfully confirmed.",
      });
      
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Booking Failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyAlternativeTime = () => {
    if (recommendations?.alternativeTimeSlot) {
      // Format dates for datetime-local input
      const start = new Date(recommendations.alternativeTimeSlot.start).toISOString().slice(0, 16);
      const end = new Date(recommendations.alternativeTimeSlot.end).toISOString().slice(0, 16);
      
      form.setValue("startTime", start);
      form.setValue("endTime", end);
      setRecommendations(null);
      toast.success("Alternative Time Applied", { description: "Please review and submit." });
    }
  };

  const applyAlternativeAsset = (assetId: string) => {
    form.setValue("assetId", assetId);
    setRecommendations(null);
    toast.success("Alternative Asset Applied", { description: "Please review and submit." });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
        <CalendarClock className="mr-2 h-4 w-4" /> Book Asset
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl">Book a Resource</DialogTitle>
          <DialogDescription>
            Schedule time for a bookable asset. Our system prevents overlaps automatically.
          </DialogDescription>
        </DialogHeader>
        
        {/* AI Recommendations Alert */}
        {recommendations && (
          <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/10 space-y-4">
            <h3 className="font-semibold text-primary flex items-center">
              <Sparkles className="h-4 w-4 mr-2" /> Smart Alternative Suggestions
            </h3>
            
            {recommendations.alternativeTimeSlot && (
              <Card className="bg-background/50 border-white/5 shadow-none">
                <CardContent className="p-3 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Next Available Time Slot</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(recommendations.alternativeTimeSlot.start).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={applyAlternativeTime}>
                    Apply <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {recommendations.alternativeAssets && recommendations.alternativeAssets.length > 0 && (
              <Card className="bg-background/50 border-white/5 shadow-none">
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium">Similar Assets Available Now</p>
                  {recommendations.alternativeAssets.map((alt: any) => (
                    <div key={alt.id} className="flex justify-between items-center bg-black/20 p-2 rounded-md">
                      <span className="text-xs">{alt.assetTag} - {alt.name}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => applyAlternativeAsset(alt.id)}>
                        Use this
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">Resource / Asset</Label>
            <Select onValueChange={(val) => form.setValue("assetId", val)} value={form.watch("assetId")}>
              <SelectTrigger className="bg-background/50 border-white/10 focus-visible:ring-primary/50">
                <SelectValue placeholder="Select a bookable asset" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("startTime")}
              />
              {form.formState.errors.startTime && (
                <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("endTime")}
              />
              {form.formState.errors.endTime && (
                <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose (Optional)</Label>
            <Input
              id="purpose"
              placeholder="e.g. Q3 Planning Meeting"
              className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
              {...form.register("purpose")}
            />
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
