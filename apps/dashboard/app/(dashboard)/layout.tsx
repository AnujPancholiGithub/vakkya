'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  Plus,
  LogOut,
  FileText,
  MessageSquare,
  Settings,
  Code,
  ChevronRight,
  Loader2,
  ClipboardList,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/error-boundary'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useProjects } from '@/lib/queries'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const activeProjectId = params.id as string | undefined
  const { data: projects, isLoading } = useProjects()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Project-level navigation items
  const projectNavItems = [
    { href: '', label: 'Overview', icon: Code },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/forms', label: 'Forms', icon: ClipboardList },
    { href: '/conversations', label: 'Conversations', icon: MessageSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border">
          <Link href="/projects" className="text-lg font-semibold">
            Vakkya
          </Link>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Projects
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : projects?.length === 0 ? (
            <div className="px-3 py-2">
              <p className="text-sm text-muted-foreground">No projects yet</p>
            </div>
          ) : (
            <nav className="space-y-0.5 px-2">
              {projects?.map((project) => {
                const isActive = activeProjectId === project.id
                return (
                  <div key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 transition-transform',
                          isActive && 'rotate-90'
                        )}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>

                    {/* Project sub-navigation */}
                    {isActive && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2">
                        {projectNavItems.map((item) => {
                          const Icon = item.icon
                          const itemPath = `/projects/${project.id}${item.href}`
                          const isItemActive =
                            item.href === ''
                              ? pathname === `/projects/${project.id}`
                              : pathname.startsWith(itemPath)
                          return (
                            <Link
                              key={item.href}
                              href={itemPath}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors',
                                isItemActive
                                  ? 'text-foreground font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          )}
        </div>

        {/* User section */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-muted/30 overflow-y-auto">
        <div className="p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}
