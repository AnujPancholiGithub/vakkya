'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, User, Bot, FileText, CheckCircle, XCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConversation, useFormEvents, type FormEvent, type ConversationTurn } from '@/lib/queries'
import { cn } from '@/lib/utils'

// Merge turns and form events into a single timeline
type TimelineItem = 
  | { type: 'turn'; data: ConversationTurn }
  | { type: 'form_event'; data: FormEvent }

function mergeTimeline(turns: ConversationTurn[], events: FormEvent[]): TimelineItem[] {
  const turnItems = turns.map(t => ({ 
    type: 'turn' as const, 
    data: t, 
    ts: new Date(t.timestamp).getTime() 
  }))
  const eventItems = events.map(e => ({ 
    type: 'form_event' as const, 
    data: e, 
    ts: new Date(e.timestamp).getTime() 
  }))
  const sorted = [...turnItems, ...eventItems].sort((a, b) => a.ts - b.ts)
  return sorted.map(item => ({ type: item.type, data: item.data }) as TimelineItem)
}

function FormEventBadge({ event }: { event: FormEvent }) {
  const getEventIcon = () => {
    switch (event.eventType) {
      case 'activated': return <Play className="h-3 w-3" />
      case 'field_collected': return <CheckCircle className="h-3 w-3" />
      case 'submitted': return <FileText className="h-3 w-3" />
      case 'abandoned': return <XCircle className="h-3 w-3" />
      default: return <FileText className="h-3 w-3" />
    }
  }

  const getEventColor = () => {
    switch (event.eventType) {
      case 'activated': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'field_collected': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'submitted': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'abandoned': return 'bg-red-500/10 text-red-600 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  const getEventLabel = () => {
    switch (event.eventType) {
      case 'activated': return 'Form Started'
      case 'field_collected': return `Collected: ${event.fieldName}`
      case 'submitted': return 'Form Submitted'
      case 'abandoned': return 'Form Abandoned'
      default: return event.eventType
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border', getEventColor())}>
      {getEventIcon()}
      <span>{getEventLabel()}</span>
      {event.fieldValue && (
        <span className="font-medium ml-1">= {event.fieldValue}</span>
      )}
      {event.attemptCount && event.attemptCount > 1 && (
        <span className="text-muted-foreground">({event.attemptCount} attempts)</span>
      )}
    </div>
  )
}

export default function ConversationDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const conversationId = params.conversationId as string
  const { data: conversation, isLoading, error } = useConversation(projectId, conversationId)
  const { data: formEvents } = useFormEvents(conversationId)

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

  const timeline = mergeTimeline(conversation.turns || [], formEvents || [])

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
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No messages in this conversation
            </p>
          ) : (
            <div className="space-y-4">
              {timeline.map((item, index) => {
                if (item.type === 'form_event') {
                  return (
                    <div key={`event-${item.data.id}`} className="flex justify-center py-2">
                      <FormEventBadge event={item.data} />
                    </div>
                  )
                }

                const turn = item.data
                return (
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
