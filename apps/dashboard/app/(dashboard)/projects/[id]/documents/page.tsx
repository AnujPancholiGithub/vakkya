'use client'

import { useParams } from 'next/navigation'
import { DocumentsTab } from '@/components/documents/documents-tab'

export default function ProjectDocumentsPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Your agent&apos;s knowledge base
        </p>
      </div>
      <DocumentsTab projectId={projectId} />
    </div>
  )
}
