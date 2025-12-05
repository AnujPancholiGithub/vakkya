'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, Loader2, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProject } from '@/lib/queries'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { getSetupStep, isSetupComplete } from '@/lib/utils'

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.id as string
  const { data: project, isLoading, error } = useProject(projectId)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  const setupComplete = project
    ? isSetupComplete({
        documentCount: project.documentCount,
        conversationCount: project.conversationCount,
      })
    : false

  useEffect(() => {
    if (!copiedEmbed) return
    const timer = setTimeout(() => setCopiedEmbed(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedEmbed])

  const embedCode = project
    ? `<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" data-token="${project.token}"></script>`
    : ''

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopiedEmbed(true)
    toast.success('Copied! Paste this in your website.')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load project</p>
      </div>
    )
  }

  const currentStep = getSetupStep({
    documentCount: project.documentCount,
    conversationCount: project.conversationCount,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {setupComplete
            ? `${project.documentCount} documents · ${project.conversationCount} conversations`
            : 'Complete setup to start using your voice agent'}
        </p>
      </div>

      {/* Setup Progress - Only show for incomplete projects */}
      {!setupComplete && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <ProgressSteps
              steps={[
                { id: 'create', label: 'Create Project' },
                { id: 'upload', label: 'Upload Documents' },
                { id: 'embed', label: 'Embed Widget' },
              ]}
              currentStep={currentStep}
              completedSteps={currentStep >= 2 ? [0, 1] : [0]}
            />

            {/* Contextual guidance based on current step */}
            <div className="mt-6 text-center">
              {currentStep === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload documents to teach your agent about your product
                  </p>
                  <Link href={`/projects/${projectId}/documents`}>
                    <Button size="sm">
                      Upload Documents
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add this snippet to your website to activate the voice widget
                  </p>
                  <div className="flex items-center gap-2 max-w-xl mx-auto">
                    <code className="flex-1 text-xs bg-background border rounded-md px-3 py-2 font-mono truncate">
                      {embedCode}
                    </code>
                    <Button size="sm" onClick={handleCopyEmbed}>
                      {copiedEmbed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste before the closing &lt;/body&gt; tag
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {setupComplete && (
        <div className="grid grid-cols-2 gap-4">
          <Link href={`/projects/${projectId}/documents`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{project.documentCount}</p>
                <p className="text-xs text-muted-foreground">
                  Knowledge base files
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/projects/${projectId}/conversations`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {project.conversationCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Voice interactions
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Widget Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widget Integration</CardTitle>
          <CardDescription>
            Add this code to your website to enable the voice widget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted border rounded-md px-3 py-2 font-mono truncate">
              {embedCode}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyEmbed}>
              {copiedEmbed ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste before the closing &lt;/body&gt; tag on any page
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
