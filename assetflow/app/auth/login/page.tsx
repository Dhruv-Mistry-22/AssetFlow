"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Box } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid credentials. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Floating asset decorations */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[10%] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hidden lg:block"
      >
        <div className="text-2xl mb-1">💻</div>
        <p className="text-[10px] text-white/40 font-semibold">MacBook</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[20%] right-[10%] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hidden lg:block"
      >
        <div className="text-2xl mb-1">🖥️</div>
        <p className="text-[10px] text-white/40 font-semibold">Monitor</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/[0.04] backdrop-blur-2xl p-10 rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-white/[0.08] relative overflow-hidden">
          
          {/* Inner glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 mx-auto rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-[0_0_40px_-5px_rgba(249,115,22,0.4)]"
            >
              AF
            </motion.div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-white/40 text-sm mt-2">Sign in to your AssetFlow account</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em] mb-2.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none transition-all text-white placeholder:text-white/20 text-sm"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em]">
                  Password
                </label>
                <a href="#" className="text-xs text-orange-400 hover:text-orange-300 font-medium">Forgot?</a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none transition-all text-white placeholder:text-white/20 text-sm"
                placeholder="••••••••"
              />
            </div>
            
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold p-4 rounded-xl hover:shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
            >
              {loading ? "Signing In..." : "Sign In"} <ArrowRight size={16} />
            </motion.button>
            
            <div className="text-center text-sm text-white/30 mt-8 pt-6 border-t border-white/[0.06]">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
                Get Started
              </Link>
            </div>
          </form>

          <div className="mt-8 text-center text-xs text-white/20 relative z-10">
            <p>Demo: <span className="text-white/30 font-mono">admin@assetflow.com</span> / <span className="text-white/30 font-mono">Admin123!</span></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
