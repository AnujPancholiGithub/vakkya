'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Terminal, Cpu, Zap, Activity, Radio, MessageSquare, FileText } from 'lucide-react'
import { isAuthenticated } from '@/lib/auth'

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(isAuthenticated())
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-accent selection:text-white font-sans">
      
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/40 bg-background/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight text-white hover:opacity-90 transition-opacity">
            <div className="h-9 w-9 relative">
               <img 
                 src="/logo.png" 
                 alt="Vakkya Logo" 
                 className="w-full h-full object-contain"
               />
            </div>
            <span className="text-xl">Vakkya</span>
          </Link>
          <div className="flex items-center gap-4">
            {loggedIn ? (
              <Link href="/projects">
                <Button size="sm" className="rounded-full px-5 bg-foreground text-background hover:opacity-90">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <Link href="/register">
                  <Button size="sm" className="rounded-full px-5 bg-foreground text-background hover:opacity-90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        
        {/* Hero */}
        <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-white/5 text-xs font-medium text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            v1.0 Public Beta
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
            The Voice Interface<br />
            <span className="text-muted-foreground">for the Web.</span>
          </h1>
          
          <p className="max-w-xl mx-auto text-lg text-muted-foreground mb-12 leading-relaxed">
            Stitch together the best AI models into one powerful widget. 
            Transform any static site into an intelligent voice agent in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="xl" className="rounded-full text-base bg-foreground text-background hover:bg-neutral-200">
                Start Building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <div className="font-mono text-xs text-muted-foreground opacity-60">
              No credit card required
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <section className="px-6 pb-32 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[800px] md:h-[600px]">
            
            {/* Card 1: The Brain (Large Left) */}
            <div className="md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl border border-border bg-neutral-900/20 hover:border-accent/50 transition-colors duration-500">
              <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-neutral-800/10 to-transparent pointer-events-none" />
              <div className="p-8 h-full flex flex-col justify-between relative z-10">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Cpu className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">The Brain</h3>
                  <p className="text-muted-foreground max-w-md">
                    Powered by LiveKit and Python 3.12. We handle the complex WebRTC handshake so you don't have to.
                  </p>
                </div>
                {/* Simulated Terminal */}
                <div className="mt-8 rounded-xl bg-black border border-border/50 p-4 font-mono text-xs text-muted-foreground shadow-2xl">
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                  </div>
                  <div><span className="text-purple-400">class</span> <span className="text-yellow-200">VoiceAgent</span>(x):</div>
                  <div className="pl-4"><span className="text-purple-400">def</span> <span className="text-blue-400">__init__</span>(self):</div>
                  <div className="pl-8">self.model = <span className="text-green-400">"gpt-4o-realtime"</span></div>
                  <div className="pl-8">self.latency = <span className="text-orange-400">"500ms"</span></div>
                </div>
              </div>
            </div>

            {/* Card 2: The Face (Top Right) */}
            <div className="group relative overflow-hidden rounded-3xl border border-border bg-neutral-900/20 hover:border-white/20 transition-colors">
              <div className="p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">The Face</h3>
                <p className="text-muted-foreground text-sm">
                  Framework-agnostic vanilla JS widget. Lives in the Shadow DOM.
                </p>
                <div className="mt-auto pt-8 flex justify-end">
                   <div className="px-4 py-2 rounded-l-xl bg-accent text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                     Just paste &lt;script&gt;
                   </div>
                </div>
              </div>
            </div>

            {/* Card 3: The Pulse (Bottom Right) */}
            <div className="group relative overflow-hidden rounded-3xl border border-border bg-neutral-900/20 hover:border-green-500/30 transition-colors">
              <div className="p-8 h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-green-500">Alive</h3>
                <p className="text-muted-foreground text-sm">
                  Bring dead static sites to life.
                </p>
                <div className="mt-auto text-4xl font-mono font-bold tracking-tighter text-white">
                  &lt;500ms
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Detailed Features */}
        <section className="py-32 px-6 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-border flex items-center justify-center">
                <FileText className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Voice FAQ Assistant</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload your product documentation (PDF, Markdown). Our RAG pipeline instantly indexes it, allowing users to ask natural language questions and get accurate answers.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-border flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Conversational Forms</h3>
              <p className="text-muted-foreground leading-relaxed">
                Turn long, boring forms into engaging voice conversations. Capture lead qualification data one question at a time, increasing completion rates.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-border flex items-center justify-center">
                <Zap className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Instant Webhooks</h3>
              <p className="text-muted-foreground leading-relaxed">
                Seamlessly integrate with your existing stack. Send collected data to Zapier, HubSpot, Slack, or your own API immediately after a conversation ends.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap / Coming Soon */}
        <section className="py-20 border-t border-border/40 bg-neutral-900/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-12">
               <div className="h-px bg-border flex-1" />
               <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Roadmap</h2>
               <div className="h-px bg-border flex-1" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="p-6 rounded-2xl border border-dashed border-border/60 opacity-60 hover:opacity-100 transition-opacity">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Teams
                </h4>
                <p className="text-xs text-muted-foreground">Collaborate on prompts and knowledge bases.</p>
              </div>
              <div className="p-6 rounded-2xl border border-dashed border-border/60 opacity-60 hover:opacity-100 transition-opacity">
                 <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Analytics
                </h4>
                <p className="text-xs text-muted-foreground">Deep insights into user voice interactions.</p>
              </div>
              <div className="p-6 rounded-2xl border border-dashed border-border/60 opacity-60 hover:opacity-100 transition-opacity">
                 <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Custom LLMs
                </h4>
                <p className="text-xs text-muted-foreground">Bring your own fine-tuned models.</p>
              </div>
              <div className="p-6 rounded-2xl border border-dashed border-border/60 opacity-60 hover:opacity-100 transition-opacity">
                 <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Hand-off
                </h4>
                <p className="text-xs text-muted-foreground">Escalate to human support agents.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee / Tech Stack */}
        <section className="py-20 border-t border-border/40">
           <div className="text-center mb-10 text-sm font-mono text-muted-foreground uppercase tracking-widest">
             Stitched With
           </div>
           <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {['Next.js', 'LiveKit', 'OpenAI', 'Tailwind', 'Fastify'].map((tech) => (
               <span key={tech} className="text-xl font-bold text-foreground">{tech}</span>
             ))}
           </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 py-12 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Vakkya Inc.</p>
        </footer>

      </main>
    </div>
  )
}
