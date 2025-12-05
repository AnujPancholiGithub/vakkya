'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Copy, Check, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useProject, useDeleteProject, useUpdateProject } from '@/lib/queries'

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { data: project, isLoading } = useProject(projectId)
  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject(projectId)

  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [initiationMode, setInitiationMode] = useState<'agent_first' | 'user_first'>('agent_first')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (project) {
      setAgentName(project.agentName || '')
      setSystemPrompt(project.systemPrompt || '')
      setInitiationMode(project.initiationMode || 'agent_first')
    }
  }, [project])

  useEffect(() => {
    if (!project) return
    const nameChanged = agentName !== (project.agentName || '')
    const promptChanged = systemPrompt !== (project.systemPrompt || '')
    const modeChanged = initiationMode !== (project.initiationMode || 'agent_first')
    setHasChanges(nameChanged || promptChanged || modeChanged)
  }, [agentName, systemPrompt, initiationMode, project])

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

  const embedCode = project
    ? `<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" data-token="${project.token}"></script>`
    : ''

  const handleCopyToken = async () => {
    if (!project?.token) return
    await navigator.clipboard.writeText(project.token)
    setCopiedToken(true)
    toast.success('Token copied')
  }

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopiedEmbed(true)
    toast.success('Embed code copied')
  }

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        agentName: agentName.trim() || null,
        systemPrompt: systemPrompt.trim() || null,
        initiationMode,
      })
      toast.success('Settings saved')
      setHasChanges(false)
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('Project deleted')
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your voice agent</p>
      </div>

      {/* Agent Personality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Personality</CardTitle>
          <CardDescription>
            Customize how your voice agent introduces itself
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Agent Name</Label>
            <Input
              id="agentName"
              placeholder="e.g., Alex from Support"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Instructions</Label>
            <textarea
              id="systemPrompt"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="You are a helpful assistant for [Company]. Be friendly and concise."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Define tone and how to handle questions</span>
              <span className={systemPrompt.length > 1800 ? 'text-amber-500' : ''}>
                {systemPrompt.length}/2000
              </span>
            </div>
          </div>
          {hasChanges && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
                {updateProject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation Behavior</CardTitle>
          <CardDescription>
            Control how conversations start
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Who speaks first?</Label>
            <div className="flex p-1 bg-muted rounded-lg w-max">
              <button
                onClick={() => setInitiationMode('agent_first')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  initiationMode === 'agent_first'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Agent First
              </button>
              <button
                onClick={() => setInitiationMode('user_first')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  initiationMode === 'user_first'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                User First
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {initiationMode === 'agent_first'
                ? 'Agent will greet the user automatically when they connect'
                : 'Agent will wait for the user to speak first'}
            </p>
          </div>
          {hasChanges && (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
                {updateProject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widget Integration</CardTitle>
          <CardDescription>Credentials for embedding the voice widget</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Embed Code</Label>
            <div className="flex gap-2">
              <Input value={embedCode} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopyEmbed}>
                {copiedEmbed ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add before &lt;/body&gt; on any page
            </p>
          </div>
          <div className="space-y-2">
            <Label>Widget Token</Label>
            <div className="flex gap-2">
              <Input
                value={project.token}
                readOnly
                className="font-mono text-xs text-muted-foreground"
              />
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                {copiedToken ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep private. Authenticates widget requests.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Project</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove this project and all its data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Project"
        description="This will permanently delete all documents and conversations. This cannot be undone."
        isLoading={deleteProject.isPending}
      />
    </div>
  )
}
