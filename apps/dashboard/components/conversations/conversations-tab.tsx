'use client'

import Link from 'next/link'
import { Loader2, ChevronRight, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useConversations } from '@/lib/queries'
import { truncateText, formatRelativeTime } from '@/lib/utils'

interface ConversationsTabProps {
  projectId: string
}

export function ConversationsTab({ projectId }: ConversationsTabProps) {
  const { data: conversations, isLoading } = useConversations(projectId)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const totalConversations = conversations?.length ?? 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            View conversation logs from your voice agent
          </p>
          {totalConversations > 0 && (
            <span className="text-sm text-muted-foreground">
              {totalConversations} conversation{totalConversations !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {conversations?.length === 0 ? (
          <div className="border border-dashed rounded-lg">
            <EmptyState
              illustration="conversations"
              title="No conversations yet"
              description="When users interact with your embedded widget, their conversations will appear here. You'll be able to review transcripts, see what questions are being asked, and improve your agent's responses."
              secondaryAction={{
                label: 'Learn about the widget',
                href: 'https://docs.vakkya.ai/widget',
              }}
            />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Preview</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Turns</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Started</th>
                  <th className="text-right px-4 py-3 text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {conversations?.map((conv) => (
                  <tr key={conv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">
                      {conv.firstQuery ? (
                        <span className="text-foreground">
                          {truncateText(conv.firstQuery, 60)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          No query recorded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{conv.turnCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatRelativeTime(conv.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/projects/${projectId}/conversations/${conv.id}`}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
