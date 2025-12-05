'use client'

import Link from 'next/link'
import { Terminal, Cpu, Zap } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Aesthetic Side */}
      <div className="hidden lg:flex flex-col justify-between bg-neutral-900 text-white p-12 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Link href="/" className="relative z-20 flex items-center font-semibold text-white mb-20">
          <div className="h-10 w-10 relative mr-3">
             <img 
                src="/logo.png" 
                alt="Vakkya Logo" 
                className="w-full h-full object-contain"
              />
          </div>
          <span className="text-xl">Vakkya</span>
        </Link>
          
          <div className="space-y-8 max-w-lg">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                Build voice agents in minutes, not months.
              </h2>
              <p className="text-neutral-400 text-lg">
                Join thousands of developers using Vakkya to add intelligent voice capabilities to their applications.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid gap-4 mt-8">
               <div className="flex items-center gap-3 text-sm text-neutral-300">
                 <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                   <Terminal className="w-4 h-4 text-purple-400" />
                 </div>
                 <span>Developer-first API design</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-neutral-300">
                 <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                   <Cpu className="w-4 h-4 text-blue-400" />
                 </div>
                 <span>State-of-the-art LLM latency</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-neutral-300">
                 <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                   <Zap className="w-4 h-4 text-green-400" />
                 </div>
                 <span>Instant deployment via script tag</span>
               </div>
            </div>
          </div>
        </div>

        {/* Footer/Quote */}
        <div className="relative z-10 mt-auto pt-12">
           <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed text-neutral-200">
              &ldquo;The fastest way to add voice to any website. It feels like magic, but it's just really good engineering.&rdquo;
            </p>
            <footer className="text-sm text-neutral-500">
              — Anuj Pancholi, Full Stack Developer
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right: Form Side */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
