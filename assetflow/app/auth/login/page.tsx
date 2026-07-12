"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
            AF
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to your AssetFlow account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-6 text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-200"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs text-blue-400 hover:text-blue-300 font-medium">Forgot password?</a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-200"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold p-3.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Signing In..." : "Sign In"} <ArrowRight size={16} />
          </button>
          
          <div className="text-center text-sm text-slate-500 mt-6 pt-6 border-t border-slate-800">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-slate-600 relative z-10">
          <p>Demo accounts (password: <span className="text-slate-400 font-mono">Admin123!</span>)</p>
          <div className="mt-2 space-y-1">
            <p>admin@assetflow.com (Admin)</p>
            <p>rohan@assetflow.com (Manager)</p>
            <p>priya@assetflow.com (Employee)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
