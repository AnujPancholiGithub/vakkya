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
    <div className="min-h-screen flex bg-black">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col fixed inset-y-0 z-50">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/projects" className="flex items-center gap-3 font-semibold tracking-tight text-white hover:opacity-90 transition-opacity">
             <div className="h-8 w-8 relative">
                <img 
                  src="/logo.png" 
                  alt="Vakkya Logo" 
                  className="w-full h-full object-contain"
                />
             </div>
             <span className="text-lg">Vakkya</span>
          </Link>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          <div className="px-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Projects
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-neutral-500 hover:text-white"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
             {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                </div>
              ) : projects?.length === 0 ? (
                <div className="px-2 py-4 border border-dashed border-white/10 rounded-lg text-center">
                  <p className="text-xs text-neutral-500">No projects yet</p>
                </div>
              ) : (
                <nav className="space-y-1">
                  {projects?.map((project) => {
                    const isActive = activeProjectId === project.id
                    return (
                      <div key={project.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          className={cn(
                            'group flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all duration-200',
                            isActive
                              ? 'bg-neutral-900 border-l-[3px] border-primary text-white '
                              : 'text-neutral-400 hover:text-white hover:bg-white/5 border-l-[3px] border-transparent'
                          )}
                        >
                           <span className="truncate">{project.name}</span>
                           <ChevronRight
                            className={cn(
                              'h-3 w-3 text-neutral-600 transition-transform duration-200 group-hover:text-neutral-400',
                              isActive && 'rotate-90 text-neutral-400'
                            )}
                          />
                        </Link>

                        {/* Project sub-navigation */}
                        {isActive && (
                          <div className="mt-1 space-y-0.5 ml-3 pl-3 border-l border-white/10">
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
                                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                                    isItemActive
                                      ? 'text-white bg-white/5 font-medium'
                                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5 opacity-70" />
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
        </div>

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 bg-black overflow-y-auto min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
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
