import { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Server } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-zinc-950">
      {/* Massive ambient glow background */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none flex items-center justify-center">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-[120px] animate-pulse duration-3000" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-[100px] animate-spin-slow mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.08] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#09090b_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-card p-10 rounded-3xl relative overflow-hidden border border-white/10 shadow-[0_0_50px_0_rgba(0,0,0,0.5)] backdrop-blur-3xl transform hover:scale-[1.01] transition-transform duration-500">
          {/* Accent glow on top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500" />
          
          <div className="flex flex-col items-center space-y-6 text-center mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
              <Server className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-2">
                AssetFlow <span className="font-light text-primary">Pro</span>
              </h1>
              <p className="text-sm text-zinc-400 font-medium">
                Enterprise Resource Command Center
              </p>
            </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
