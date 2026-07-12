import { Metadata } from "next";
import { LoginForm } from "./login-form";
import { ShieldCheck, Server, Activity } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "AssetFlow | Authenticate",
  description: "Secure login to AssetFlow enterprise portal.",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/30 blur-[120px]" />
      </div>

      <div className="container relative z-10 flex h-[800px] w-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        
        {/* Left Side: Branding/Hero */}
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r dark:border-white/10 lg:flex overflow-hidden">
          <div className="absolute inset-0 bg-zinc-900" />
          
          {/* Subtle animated grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          
          <div className="relative z-20 flex items-center text-2xl font-bold tracking-tight">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Server className="h-5 w-5 text-primary-foreground" />
            </div>
            AssetFlow <span className="font-light text-muted-foreground ml-2">Enterprise</span>
          </div>

          <div className="relative z-20 mt-auto mb-10">
            <blockquote className="space-y-4">
              <p className="text-3xl font-medium leading-tight">
                "Intelligent asset management, zero double-allocations, and seamless booking conflict resolution in one cohesive platform."
              </p>
              <footer className="flex items-center space-x-3 text-muted-foreground text-sm">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>Enterprise-Grade Security & Validation</span>
              </footer>
            </blockquote>
          </div>
        </div>

        {/* Right Side: Login Form (Glassmorphic) */}
        <div className="lg:p-8 w-full flex justify-center">
          <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[450px]">
            
            {/* Mobile Header (Hidden on Desktop) */}
            <div className="flex flex-col items-center space-y-2 lg:hidden mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Server className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">AssetFlow</h1>
            </div>

            <div className="glass-card p-10 rounded-3xl relative overflow-hidden">
              {/* Subtle accent line on top of card */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              
              <div className="flex flex-col space-y-2 text-center mb-8">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center justify-center">
                  Sign In
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your corporate credentials to access the portal.
                </p>
              </div>

              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
