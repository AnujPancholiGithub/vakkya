import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  FolderPlus,
  Upload,
  Code,
  FileText,
  FileType,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

type IllustrationType = 'workflow' | 'documents' | 'conversations'

interface EmptyStateProps {
  icon?: React.ReactNode
  illustration?: IllustrationType
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    href: string
  }
  className?: string
}

function WorkflowIllustration() {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <FolderPlus className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">Create</span>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">Upload</span>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Code className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">Embed</span>
      </div>
    </div>
  )
}


function DocumentsIllustration() {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-red-600" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">PDF</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <FileType className="w-5 h-5 text-blue-600" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">TXT</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">MD</span>
      </div>
    </div>
  )
}

function ConversationsIllustration() {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Code className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">Widget</span>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground mt-1">Conversations</span>
      </div>
    </div>
  )
}

const illustrations: Record<IllustrationType, React.FC> = {
  workflow: WorkflowIllustration,
  documents: DocumentsIllustration,
  conversations: ConversationsIllustration,
}

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrations[illustration] : null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {IllustrationComponent && <IllustrationComponent />}
      {icon && !illustration && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mb-3">
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <a
          href={secondaryAction.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          data-testid="empty-state-docs-link"
        >
          {secondaryAction.label}
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}
