'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Loader2, FileText, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <EmptyState
            illustration="workflow"
            title="Create your first voice agent"
            description="Get started in three simple steps: create a project, upload your documents, and embed the widget on your site."
            action={{
              label: 'Create Project',
              onClick: () => setShowCreateDialog(true),
            }}
            secondaryAction={{
              label: 'Read the docs',
              href: 'https://docs.vakkya.ai/getting-started',
            }}
          />
          <CreateProjectDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
        </div>
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
