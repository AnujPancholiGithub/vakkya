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

  // Widget Customization State
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [position, setPosition] = useState<'bottom-left' | 'bottom-right'>('bottom-right')
  const [accentColor, setAccentColor] = useState('#3B82F6')

  const PRESET_COLORS = [
    '#3B82F6', // Blue (Default)
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#14B8A6', // Teal
    '#6366F1', // Indigo
  ]

  const setupComplete = project
    ? isSetupComplete({
        documentCount: project.documentCount,
        conversationCount: project.conversationCount,
      })
    : false

  // Widget Preview Content Generation
  const getPreviewHtml = () => {
    if (!project?.token) return ''
    
    // We add some base styles to the iframe content to make it look nice
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background-color: ${theme === 'dark' ? '#09090b' : '#ffffff'};
              color: ${theme === 'dark' ? '#fafafa' : '#09090b'};
              height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background-image: radial-gradient(${theme === 'dark' ? '#27272a' : '#e5e7eb'} 1px, transparent 1px);
              background-size: 24px 24px;
            }
            .content {
              text-align: center;
              padding: 20px;
              opacity: 0.6;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            p { font-size: 16px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="content">
            <h1>Your Website</h1>
            <p>The widget will appear in the ${position.replace('-', ' ')} corner.</p>
          </div>
          <script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js"
            data-api-url="${process.env.NEXT_PUBLIC_API_URL}"
            data-token="${project.token}"
            data-theme="${theme}"
            data-position="${position}"
            data-accent-color="${accentColor}">
          </script>
        </body>
      </html>
    `
  }

  useEffect(() => {
    if (!copiedEmbed) return
    const timer = setTimeout(() => setCopiedEmbed(false), 2000)
    return () => clearTimeout(timer)
  }, [copiedEmbed])

  const embedCode = project
    ? `<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js"
  data-token="${project.token}"
  data-theme="${theme}"
  data-position="${position}"
  data-accent-color="${accentColor}"></script>`
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

      {/* Widget Integration & Customization */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customization Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Widget Customization</CardTitle>
            <CardDescription>
              Customize how the widget looks entirely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              {/* Theme */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Theme</label>
                <div className="flex p-1 bg-muted rounded-lg w-max">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      theme === 'light'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Light ☀️
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      theme === 'dark'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Dark 🌙
                  </button>
                </div>
              </div>

              {/* Position */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Position</label>
                <div className="flex p-1 bg-muted rounded-lg w-max">
                  <button
                    onClick={() => setPosition('bottom-left')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      position === 'bottom-left'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Bottom Left ↙️
                  </button>
                  <button
                    onClick={() => setPosition('bottom-right')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      position === 'bottom-right'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Bottom Right ↘️
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ${
                        accentColor === color ? 'ring-primary scale-110' : 'ring-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <div className="relative group">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-full p-0 border-0 cursor-pointer opacity-0 absolute inset-0"
                    />
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-muted bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                      title="Custom Color"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="font-mono">{accentColor}</span>
                </p>
              </div>
            </div>

            {/* Install Code */}
            <div className="space-y-3 pt-6 border-t">
              <label className="text-sm font-medium">Installation Code</label>
              <div className="relative">
                <div className="bg-muted border rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre">
                  {embedCode}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 h-8"
                  onClick={handleCopyEmbed}
                >
                  {copiedEmbed ? (
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {copiedEmbed ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this code before the closing <code className="bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-background border rounded px-3 py-1 text-xs text-muted-foreground w-48 text-center truncate">
                  your-website.com
                </div>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 bg-background relative min-h-[500px]">
            <iframe 
              srcDoc={getPreviewHtml()}
              className="w-full h-full border-0 absolute inset-0"
              title="Widget Preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
