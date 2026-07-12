"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Box, BarChart3, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
              AF
            </div>
            <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              AssetFlow
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login" 
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/register" 
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full transition-all shadow-lg shadow-blue-600/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] opacity-30 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold mb-4 animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-both">
            <Zap size={14} className="text-yellow-400" />
            The Future of Enterprise Resource Planning
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight animate-in slide-in-from-bottom-6 duration-700 delay-150 fade-in fill-mode-both">
            Manage your assets with{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              intelligent precision
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto animate-in slide-in-from-bottom-6 duration-700 delay-300 fade-in fill-mode-both">
            AssetFlow brings enterprise-grade asset tracking, allocation, maintenance, and auditing into a single, beautifully designed ecosystem.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in slide-in-from-bottom-8 duration-700 delay-500 fade-in fill-mode-both">
            <Link 
              href="/auth/register" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)]"
            >
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <Link 
              href="/auth/login" 
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-full border border-slate-700 transition-all"
            >
              Access Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-900/50 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Box size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Lifecycle Tracking</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Track every piece of equipment from acquisition to disposal. Know exactly where your resources are at all times.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Structured Audits</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Run smooth department-wide audits with our integrated verification tools, missing asset flagging, and automated reports.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Predictive Insights</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Get real-time KPI ribbons and historical analytics to optimize asset utilization and slash unnecessary expenditures.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
