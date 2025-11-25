'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProject } from '@/lib/queries'
import { DocumentsTab } from '@/components/documents/documents-tab'
import { ConversationsTab } from '@/components/conversations/conversations-tab'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const { data: project, isLoading, error } = useProject(projectId)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  // Cleanup timeout on unmount
  useEffect(() => {
    if (!copiedToken) return
    const timer = setTimeout(() => setCopiedToken(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedToken])

  useEffect(() => {
    if (!copiedEmbed) return
    const timer = setTimeout(() => setCopiedEmbed(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedEmbed])

  const handleCopyToken = async () => {
    if (project?.token) {
      await navigator.clipboard.writeText(project.token)
      setCopiedToken(true)
      toast.success('Token copied!')
    }
  }

  const embedCode = project
    ? `<script src="https://cdn.vakkya.ai/widget.js" data-token="${project.token}"></script>`
    : ''

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopiedEmbed(true)
    toast.success('Embed code copied!')
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
        <p className="text-destructive">Failed to load project. Please try again.</p>
        <Link href="/projects">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Widget Integration</CardTitle>
          <CardDescription>
            Use these credentials to embed the voice widget on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Widget Token</Label>
            <div className="flex gap-2">
              <Input
                value={project.token}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                {copiedToken ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Embed Code</Label>
            <div className="flex gap-2">
              <Input
                value={embedCode}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={handleCopyEmbed}>
                {copiedEmbed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>
        <TabsContent value="documents">
          <DocumentsTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="conversations">
          <ConversationsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
