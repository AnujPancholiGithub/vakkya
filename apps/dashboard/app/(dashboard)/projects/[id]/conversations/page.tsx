'use client'

import { useParams } from 'next/navigation'
import { ConversationsTab } from '@/components/conversations/conversations-tab'

export default function ProjectConversationsPage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Voice interactions from your widget
        </p>
      </div>
      <ConversationsTab projectId={projectId} />
    </div>
  )
}
