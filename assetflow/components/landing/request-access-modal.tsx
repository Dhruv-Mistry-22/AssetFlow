"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

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
import { accessRequestSchema } from "@/lib/schemas";

type FormValues = z.infer<typeof accessRequestSchema>;

export function RequestAccessModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      department: "",
      reason: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit request");
      }

      setSuccess(true);
      toast.success("Request Submitted", {
        description: "Your access request has been sent to the admins.",
      });
      form.reset();
    } catch (error: any) {
      toast.error("Submission Failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if(!o) setSuccess(false); }}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap h-11 bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/20 transition-all font-semibold rounded-full px-8">
        Request Access
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] glass-card border-white/10">
        <DialogHeader>
          <DialogTitle>Request Platform Access</DialogTitle>
          <DialogDescription>
            Submit this form to request an account. An administrator will review your application.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
              <KeyRound className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white">Application Received</h3>
            <p className="text-sm text-muted-foreground">
              Your request has been forwarded to the IT department. You will be able to log in with your password once approved.
            </p>
            <Button onClick={() => setOpen(false)} className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
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
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                  {...form.register("department")}
                />
                {form.formState.errors.department && (
                  <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input
                id="email"
                type="email"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Desired Password</Label>
              <Input
                id="password"
                type="password"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50"
                {...form.register("password")}
              />
              <p className="text-[10px] text-muted-foreground leading-tight">Must contain at least 4 characters. You will use this to log in once approved.</p>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Access</Label>
              <Textarea
                id="reason"
                className="bg-background/50 border-white/10 focus-visible:ring-primary/50 resize-none h-20"
                {...form.register("reason")}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
