import Link from "next/link";
import { Package, ShieldCheck, Activity, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestAccessModal } from "@/components/landing/request-access-modal";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();
  
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black overflow-hidden flex flex-col relative">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-purple-500/10 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl">
            <Package className="h-6 w-6 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">AssetFlow</span>
        </div>
        <div className="flex items-center gap-4">
          {session ? (
            <Link href="/dashboard">
              <Button variant="ghost" className="text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Enterprise Asset Management
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Control your assets.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-400">
              Eliminate chaos.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            AssetFlow brings order to enterprise resource planning with strict double-booking prevention, AI conflict resolution, and real-time IT tracking.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {session ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/20 transition-all font-semibold rounded-full px-8 group">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : (
              <>
                <RequestAccessModal />
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full px-8 group">
                    Sign In <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 text-left animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <ShieldCheck className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Zero Overlaps</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Strict database constraints ensure assets are never double-booked or double-allocated.
            </p>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <Activity className="h-8 w-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Real-time Webhooks</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Critical maintenance issues instantly trigger alerts to your corporate chat tools.
            </p>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <Users className="h-8 w-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Resolver</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              When conflicts occur, AI suggests alternative assets and time slots instantly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 mt-12 text-center text-sm text-muted-foreground">
        <p>© 2026 AssetFlow. Built for the Enterprise Hackathon.</p>
      </footer>
    </div>
  );
}
