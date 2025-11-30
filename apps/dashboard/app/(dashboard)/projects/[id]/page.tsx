'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Copy, Check, Loader2, ArrowLeft, Trash2, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useProject, useDeleteProject, useUpdateProject } from '@/lib/queries'
import { DocumentsTab } from '@/components/documents/documents-tab'
import { ConversationsTab } from '@/components/conversations/conversations-tab'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { data: project, isLoading, error } = useProject(projectId)
  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject(projectId)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // Agent settings state
  const [agentName, setAgentName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [hasAgentChanges, setHasAgentChanges] = useState(false)

  // Initialize agent settings when project loads
  useEffect(() => {
    if (project) {
      setAgentName(project.systemPrompt ? (project.agentName || '') : '')
      setSystemPrompt(project.systemPrompt || '')
    }
  }, [project])

  // Track changes
  useEffect(() => {
    if (!project) return
    const nameChanged = agentName !== (project.agentName || '')
    const promptChanged = systemPrompt !== (project.systemPrompt || '')
    setHasAgentChanges(nameChanged || promptChanged)
  }, [agentName, systemPrompt, project])

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
    ? `<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" data-token="${project.token}"></script>`
    : ''

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopiedEmbed(true)
    toast.success('Embed code copied!')
  }

  const handleDeleteProject = async () => {
    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('Project deleted')
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  const handleSaveAgentSettings = async () => {
    try {
      await updateProject.mutateAsync({
        agentName: agentName.trim() || null,
        systemPrompt: systemPrompt.trim() || null,
      })
      toast.success('Agent settings saved')
      setHasAgentChanges(false)
    } catch {
      toast.error('Failed to save agent settings')
    }
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
      <div className="flex items-center justify-between">
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Agent Settings</CardTitle>
          <CardDescription>
            Customize how your voice agent behaves and responds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Agent Name</Label>
            <Input
              id="agentName"
              placeholder="e.g., Sarah from Acme Support"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Give your agent a personality with a custom name
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Custom Instructions</Label>
            <textarea
              id="systemPrompt"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g., You are a friendly real estate assistant. Help visitors find their dream home. Be warm, professional, and knowledgeable about the local market."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Define your agent&apos;s personality, tone, and behavior</span>
              <span>{systemPrompt.length}/2000</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAgentSettings}
              disabled={!hasAgentChanges || updateProject.isPending}
            >
              {updateProject.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
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

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? All documents and conversations will be permanently removed. This action cannot be undone."
        isLoading={deleteProject.isPending}
      />
    </div>
  )
}
