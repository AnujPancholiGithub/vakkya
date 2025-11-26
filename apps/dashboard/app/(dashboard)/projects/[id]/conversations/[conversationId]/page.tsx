'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, User, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConversation } from '@/lib/queries'
import { cn } from '@/lib/utils'

export default function ConversationDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const conversationId = params.conversationId as string
  const { data: conversation, isLoading, error } = useConversation(projectId, conversationId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load conversation.</p>
        <Link href={`/projects/${projectId}`}>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Conversation</h1>
          <p className="text-muted-foreground">
            {new Date(conversation.startedAt).toLocaleString()} · {conversation.turnCount} turns
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {conversation.turns?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No messages in this conversation
            </p>
          ) : (
            <div className="space-y-4">
              {conversation.turns?.map((turn) => (
                <div key={turn.id} className="space-y-3">
                  {/* User message */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">User</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(turn.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className={cn(
                        'text-sm p-3 rounded-lg bg-muted',
                        'max-w-[80%]'
                      )}>
                        {turn.userQuery}
                      </p>
                    </div>
                  </div>

                  {/* Agent response */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">Agent</span>
                      </div>
                      <p className={cn(
                        'text-sm p-3 rounded-lg bg-green-50 dark:bg-green-950/30',
                        'max-w-[80%]'
                      )}>
                        {turn.agentResponse}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
