"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, Box, BarChart3, ShieldCheck, Zap, Check, ChevronRight, Layers, Truck, Cpu, Globe, Sparkles } from "lucide-react";

// Animated counter hook
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  
  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);
  
  return { count, ref };
}

// Floating 3D-style asset card component
function FloatingAssetCard({ icon, label, delay, className }: { icon: string; label: string; delay: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 80, damping: 15 }}
      className={`absolute bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ${className}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay * 0.5 }}
      >
        <div className="text-3xl mb-2">{icon}</div>
        <p className="text-xs font-semibold text-white/80">{label}</p>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
  
  const stat1 = useCounter(24744, 2500);
  const stat2 = useCounter(99, 2000);
  const stat3 = useCounter(150, 2000);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center font-bold text-sm shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              AF
            </div>
            <span className="font-bold text-xl tracking-tight">AssetFlow</span>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-6"
          >
            <Link href="#features" className="text-sm font-medium text-white/50 hover:text-white transition-colors hidden md:block">Features</Link>
            <Link href="#stats" className="text-sm font-medium text-white/50 hover:text-white transition-colors hidden md:block">Stats</Link>
            <Link href="/auth/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/auth/register" 
              className="text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-full transition-all shadow-[0_0_30px_-5px_rgba(249,115,22,0.4)] hover:shadow-[0_0_50px_-5px_rgba(249,115,22,0.6)] hover:scale-105"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Massive gradient orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/15 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-20 w-[300px] h-[300px] bg-orange-600/8 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />

        {/* Floating Asset Cards - relevant to project */}
        <FloatingAssetCard icon="💻" label="MacBook Pro" delay={0.8} className="top-[20%] left-[8%] rotate-[-6deg]" />
        <FloatingAssetCard icon="🖥️" label="Dell Monitor" delay={1.0} className="top-[15%] right-[10%] rotate-[4deg]" />
        <FloatingAssetCard icon="🪑" label="Ergo Chair" delay={1.2} className="bottom-[25%] left-[5%] rotate-[3deg]" />
        <FloatingAssetCard icon="📷" label="Sony Camera" delay={1.4} className="bottom-[20%] right-[8%] rotate-[-3deg]" />
        <FloatingAssetCard icon="🖨️" label="HP Printer" delay={1.6} className="top-[45%] right-[3%] rotate-[6deg]" />
        <FloatingAssetCard icon="📱" label="iPad Pro" delay={1.1} className="top-[55%] left-[3%] rotate-[-4deg]" />

        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center space-y-10 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-bold"
          >
            <Sparkles size={14} /> Enterprise Asset Intelligence Platform
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl lg:text-8xl font-black tracking-tight max-w-5xl mx-auto leading-[0.95]"
          >
            Track every asset.{" "}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Own every decision.
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg lg:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed"
          >
            AssetFlow is the intelligent platform that transforms chaotic inventory into precision-managed resources. Allocate, audit, maintain — all in one place.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6"
          >
            <Link href="/auth/register">
              <motion.div
                whileHover={{ scale: 1.05, boxShadow: '0 0 60px -15px rgba(249,115,22,0.6)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-base rounded-full shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)] transition-shadow cursor-pointer"
              >
                Start Free Trial <ArrowRight size={20} />
              </motion.div>
            </Link>
            <Link href="/auth/login">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-3 px-10 py-5 bg-white/5 backdrop-blur-xl text-white/80 font-bold text-base rounded-full border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              >
                Access Dashboard <ChevronRight size={18} />
              </motion.div>
            </Link>
          </motion.div>

          {/* Trusted by bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="pt-16 flex items-center justify-center gap-8 text-white/20 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            <span>Trusted by</span>
            <div className="flex items-center gap-8">
              <Globe size={20} className="text-white/15" />
              <Cpu size={20} className="text-white/15" />
              <Layers size={20} className="text-white/15" />
              <Truck size={20} className="text-white/15" />
            </div>
            <span>500+ companies</span>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-orange-500"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* ========== STATS SECTION ========== */}
      <section id="stats" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80 }}
              className="text-center space-y-4"
            >
              <div ref={stat1.ref} className="text-7xl font-black bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                {stat1.count.toLocaleString()}+
              </div>
              <p className="text-white/40 font-medium">Assets Tracked</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, delay: 0.1 }}
              className="text-center space-y-4"
            >
              <div ref={stat2.ref} className="text-7xl font-black bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                {stat2.count}%
              </div>
              <p className="text-white/40 font-medium">Uptime SLA</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, delay: 0.2 }}
              className="text-center space-y-4"
            >
              <div ref={stat3.ref} className="text-7xl font-black bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                {stat3.count}+
              </div>
              <p className="text-white/40 font-medium">Enterprise Clients</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-orange-500 font-bold text-sm uppercase tracking-[0.2em] mb-4">Capabilities</p>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight">
              Everything you need.<br />
              <span className="text-white/30">Nothing you don&apos;t.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Box size={28} />, title: "Lifecycle Tracking", desc: "Track every piece of equipment from acquisition to disposal. Full chain of custody with QR code integration.", color: "orange", delay: 0 },
              { icon: <ShieldCheck size={28} />, title: "Structured Audits", desc: "Run department-wide audits with integrated verification, missing asset flagging, and automated PDF reports.", color: "amber", delay: 0.1 },
              { icon: <BarChart3 size={28} />, title: "Predictive Analytics", desc: "Real-time KPI dashboards and historical analytics to optimize utilization and slash unnecessary expenditures.", color: "orange", delay: 0.2 },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: f.delay, type: "spring", stiffness: 80, damping: 15 }}
                whileHover={{ y: -8, boxShadow: '0 40px 80px -20px rgba(249, 115, 22, 0.15)' }}
                className="p-10 rounded-[2rem] bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl hover:border-orange-500/20 transition-all group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">{f.desc}</p>
                <div className="flex items-center gap-2 text-orange-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight size={14} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== BENTO GRID ========== */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 60 }}
              className="p-12 rounded-[2rem] bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/10 backdrop-blur-xl relative overflow-hidden group"
            >
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/20 transition-all" />
              <p className="text-orange-400 font-bold text-xs uppercase tracking-[0.2em] mb-6">Real-Time</p>
              <h3 className="text-3xl font-bold mb-4">Live Asset Map</h3>
              <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-sm">See where every asset is deployed across your organization. Live updates, department filters, instant search.</p>
              <div className="grid grid-cols-3 gap-3">
                {["Engineering", "Marketing", "Operations"].map((d, i) => (
                  <motion.div 
                    key={d}
                    initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-center"
                  >
                    <p className="text-2xl font-bold">{[42, 28, 35][i]}</p>
                    <p className="text-[10px] text-white/40 mt-1">{d}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 60 }}
              className="p-12 rounded-[2rem] bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl space-y-8"
            >
              <p className="text-orange-400 font-bold text-xs uppercase tracking-[0.2em]">Automation</p>
              <h3 className="text-3xl font-bold">Zero Friction Workflows</h3>
              <div className="space-y-4">
                {[
                  "Automatic allocation on employee onboarding",
                  "Slack notifications for overdue assets",
                  "PDF audit reports generated instantly",
                  "QR code scanning for instant lookup"
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                      <Check size={16} className="text-orange-400" />
                    </div>
                    <p className="text-sm text-white/60">{item}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 60 }}
            className="space-y-8"
          >
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight">
              Ready to take{" "}
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">control</span>?
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Join 500+ companies already using AssetFlow to manage their resources with intelligent precision.
            </p>
            <Link href="/auth/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg rounded-full shadow-[0_0_60px_-10px_rgba(249,115,22,0.5)] cursor-pointer mt-4"
              >
                Get Started Free <ArrowRight size={22} />
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center font-bold text-xs">AF</div>
            <span className="font-bold text-sm">AssetFlow</span>
          </div>
          <p className="text-white/20 text-xs">© 2026 AssetFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
