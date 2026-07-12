"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Fingerprint, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const response = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (response?.error) {
        toast.error("Authentication Failed", {
          description: "Invalid email or password. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Welcome back!", {
        description: "Successfully authenticated to AssetFlow.",
      });

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast.error("System Error", {
        description: "An unexpected error occurred. Please contact IT.",
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="pl-10 bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
              disabled={isLoading}
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-destructive font-medium">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-10 bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
              disabled={isLoading}
              {...form.register("password")}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-destructive font-medium">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 group"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
        )}
        {isLoading ? "Authenticating..." : "Secure Login"}
      </Button>
      
      <div className="text-center text-sm text-muted-foreground mt-4">
        Don't have an account? <span className="text-primary hover:underline cursor-pointer">Contact your Admin</span>
      </div>
    </form>
  );
}
