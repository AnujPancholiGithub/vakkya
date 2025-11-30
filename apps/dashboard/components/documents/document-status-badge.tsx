'use client'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DocumentStatusBadgeProps {
  status: string
  error?: string
}

const statusConfig: Record<string, { label: string; className: string; tooltip: string }> = {
  uploading: {
    label: 'Uploading',
    className: 'bg-blue-100 text-blue-800',
    tooltip: 'File is being uploaded to the server',
  },
  processing: {
    label: 'Processing',
    className: 'bg-yellow-100 text-yellow-800',
    tooltip: 'Document is being chunked and embedded for RAG',
  },
  completed: {
    label: 'Ready',
    className: 'bg-green-100 text-green-800',
    tooltip: 'Document is ready and available for voice agent queries',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800',
    tooltip: 'Processing failed - check file format and retry',
  },
}

export function getStatusTooltip(status: string): string {
  return statusConfig[status]?.tooltip || 'Unknown status'
}

export function DocumentStatusBadge({ status, error }: DocumentStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.processing

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-help',
                config.className
              )}
            >
              {config.label}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
        {error && (
          <span className="text-xs text-destructive" title={error}>
            {error.length > 30 ? `${error.slice(0, 30)}...` : error}
          </span>
        )}
      </div>
    </TooltipProvider>
  )
}
