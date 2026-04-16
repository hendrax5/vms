'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Server, ShieldCheck, Mail, Cpu } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />

      <main className="z-10 container mx-auto px-6 py-12 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-100 tracking-wide">Antigravity Next-Gen Systems</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-slate-400">
            Visitor & Infrastructure <br /> Intelligence Hub
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            A standalone, completely decoupled ecosystem for managing Data Center Visits, Rack Logistics, Cross-Connects, and predictive SLA maintenance reporting.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          {/* Card 1 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group cursor-pointer">
            <div className="bg-blue-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-blue-500/30">
              <Mail className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Email-Driven Permits</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Automated polling of incoming requests via Email. Parses visitors, dates, and locations automatically without manual entry.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group cursor-pointer relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="bg-purple-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-purple-500/30">
              <Server className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">DCIM & Logistics</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Full control over physical rack placements. Smart algorithms prevent U-Space and port-level collisions.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group cursor-pointer">
            <div className="bg-emerald-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">SLA Tracking</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Track vendor maintenance windows, auto-calculate downtimes, and provide transparent intelligence to clients.
            </p>
          </div>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6, duration: 0.8 }}
           className="mt-16"
        >
          <Link href="/dashboard" className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold tracking-wide shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 group">
            Enter Dashboard Portals
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
