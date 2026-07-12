"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setError(data.details[0].message);
        } else {
          setError(data.error || "Failed to create account");
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Floating asset decorations */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-[12%] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hidden lg:block"
      >
        <div className="text-2xl mb-1">📦</div>
        <p className="text-[10px] text-white/40 font-semibold">Inventory</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute bottom-[25%] left-[8%] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hidden lg:block"
      >
        <div className="text-2xl mb-1">🪑</div>
        <p className="text-[10px] text-white/40 font-semibold">Furniture</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/[0.04] backdrop-blur-2xl p-10 rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-white/[0.08] relative overflow-hidden">
          
          {/* Inner glow */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 mx-auto rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-[0_0_40px_-5px_rgba(249,115,22,0.4)]"
            >
              AF
            </motion.div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
            <p className="text-white/40 text-sm mt-2">Join AssetFlow as an employee</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm mb-6 text-center"
            >
              {error}
            </motion.div>
          )}

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 text-green-400 p-8 rounded-2xl text-center space-y-3"
            >
              <div className="text-4xl">✅</div>
              <h3 className="font-bold text-lg">Account Created!</h3>
              <p className="text-sm text-green-400/70">Redirecting to login...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em] mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none transition-all text-white placeholder:text-white/20 text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em] mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none transition-all text-white placeholder:text-white/20 text-sm"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em] mb-2">Department <span className="text-white/20">(Optional)</span></label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none transition-all text-white placeholder:text-white/20 text-sm"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.15em] mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                {loading ? "Creating Account..." : "Create Account"} <ArrowRight size={16} />
              </motion.button>
              
              <div className="text-center text-sm text-white/30 mt-6 pt-6 border-t border-white/[0.06]">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
