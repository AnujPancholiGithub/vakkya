import { cn } from '@/lib/utils'

interface DocumentStatusBadgeProps {
  status: string
  error?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  uploading: {
    label: 'Uploading',
    className: 'bg-blue-100 text-blue-800',
  },
  processing: {
    label: 'Processing',
    className: 'bg-yellow-100 text-yellow-800',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800',
  },
}

export function DocumentStatusBadge({ status, error }: DocumentStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.processing

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          config.className
        )}
      >
        {config.label}
      </span>
      {error && (
        <span className="text-xs text-destructive" title={error}>
          {error.length > 30 ? `${error.slice(0, 30)}...` : error}
        </span>
      )}
    </div>
  )
}
