"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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

const registerSchema = z.object({
  name: z.string().min(2, "Asset name is required"),
  categoryId: z.string().min(1, "Please select a category"),
  serialNumber: z.string().min(2, "Serial number is required"),
  acquisitionCost: z.coerce.number().min(0, "Cost must be a positive number"),
  acquisitionDate: z.string().min(1, "Date is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  isBookable: z.boolean().default(false),
});

type FormValues = z.infer<typeof registerSchema>;

interface Category {
  id: string;
  name: string;
}

export function RegisterAssetModal({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      categoryId: "",
      serialNumber: "",
      acquisitionCost: 0,
      acquisitionDate: new Date().toISOString().slice(0, 10),
      location: "",
      description: "",
      isBookable: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          acquisitionDate: new Date(data.acquisitionDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to register asset");
      }

      toast.success("Asset Registered", {
        description: `${data.name} has been added to the inventory.`,
      });
      
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Registration Failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105">
        <Plus className="mr-2 h-4 w-4" /> Register Asset
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl">Register New Asset</DialogTitle>
          <DialogDescription>
            Enter the details of the new asset below. A unique Asset Tag will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name</Label>
              <Input
                id="name"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select onValueChange={(val) => form.setValue("categoryId", val)}>
                <SelectTrigger className="bg-background/50 border-white/10 focus-visible:ring-primary/50">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("serialNumber")}
              />
              {form.formState.errors.serialNumber && (
                <p className="text-xs text-destructive">{form.formState.errors.serialNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisitionDate">Acquisition Date</Label>
              <Input
                id="acquisitionDate"
                type="date"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("acquisitionDate")}
              />
              {form.formState.errors.acquisitionDate && (
                <p className="text-xs text-destructive">{form.formState.errors.acquisitionDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Acquisition Cost ($)</Label>
            <Input
              id="acquisitionCost"
              type="number"
              step="0.01"
              className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
              {...form.register("acquisitionCost")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
              {...form.register("location")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description & Notes (Optional)</Label>
            <Textarea
              id="description"
              className="bg-background/50 border-white/10 focus-visible:ring-primary/50 resize-none h-20"
              {...form.register("description")}
            />
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
