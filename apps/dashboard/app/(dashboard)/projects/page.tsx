'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Loader2, FileText, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProjects, type ProjectWithToken } from '@/lib/queries'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { formatRelativeTime, getSetupStatus, cn } from '@/lib/utils'

function SetupStatusBadge({ status }: { status: 'incomplete' | 'ready' | 'active' }) {
  if (status === 'active') return null
  
  const badgeStyles = {
    incomplete: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  }
  
  const badgeText = {
    incomplete: 'Setup Incomplete',
    ready: 'Ready to Embed',
  }
  
  return (
    <span 
      data-testid="setup-status-badge"
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        badgeStyles[status]
      )}
    >
      {badgeText[status]}
    </span>
  )
}

function ProjectCard({ project }: { project: ProjectWithToken }) {
  const setupStatus = getSetupStatus(project)
  const lastActivity = project.updatedAt
  
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
        <CardHeader className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
            <SetupStatusBadge status={setupStatus} />
          </div>
          <CardDescription className="flex items-center gap-1">
            Active {formatRelativeTime(lastActivity)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground" data-testid="project-metrics">
            <div className="flex items-center gap-1.5" data-testid="document-count">
              <FileText className="h-4 w-4" data-testid="file-icon" />
              <span>{project.documentCount === 0 ? 'No docs' : project.documentCount}</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="conversation-count">
              <MessageSquare className="h-4 w-4" data-testid="chat-icon" />
              <span>{project.conversationCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function ProjectsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { data: projects, isLoading, error } = useProjects()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load projects. Please try again.</p>
      </div>
    )
  }

  if (projects?.length === 0) {
    return (
    <div className="max-w-5xl mx-auto py-12">
        <div className="text-center mb-12 space-y-2">
           <h1 className="text-3xl font-bold tracking-tight text-white">Let's build something amazing</h1>
           <p className="text-neutral-400">Choose a starting point for your new voice agent.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
           {/* Starter 1: Blank */}
           <div 
             onClick={() => setShowCreateDialog(true)}
             className="group relative bg-neutral-900 border border-white/10 p-6 rounded-2xl hover:border-primary/50 cursor-pointer transition-all hover:shadow-[0_0_30px_-5px_var(--color-primary)] hover:shadow-primary/20"
           >
              <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-white/5 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Blank Project</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Start from scratch. Upload your own documents and configure your agent exactly how you want.
              </p>
           </div>

           {/* Starter 2: FAQ Bot (Visual Only for now) */}
           <div 
             onClick={() => setShowCreateDialog(true)}
             className="group relative bg-neutral-900 border border-white/10 p-6 rounded-2xl hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-[0_0_30px_-5px_#3b82f640]"
           >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Voice FAQ Bot</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Perfect for documentation. Pre-configured for RAG with PDF uploads.
              </p>
           </div>

           {/* Starter 3: Lead Capture (Visual Only) */}
           <div 
             onClick={() => setShowCreateDialog(true)}
             className="group relative bg-neutral-900 border border-white/10 p-6 rounded-2xl hover:border-green-500/50 cursor-pointer transition-all hover:shadow-[0_0_30px_-5px_#22c55e40]"
           >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 text-green-500 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Lead Capture</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Collect user information through natural flowing conversation.
              </p>
           </div>
        </div>

        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
    </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">All Projects</h1>
        <p className="text-sm text-muted-foreground">
          {projects?.length} project{projects?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
