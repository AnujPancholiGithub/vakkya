'use client'

import Link from 'next/link'
import { MessageSquare, Loader2, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useConversations } from '@/lib/queries'

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

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground mb-4">
          View conversation logs from your voice agent
        </p>

        {conversations?.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Conversations will appear here once users interact with your widget
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Session</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Turns</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Started</th>
                  <th className="text-right px-4 py-3 text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {conversations?.map((conv) => (
                  <tr key={conv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-mono">
                      {conv.sessionId?.slice(0, 8) || conv.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">{conv.turnCount} turns</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(conv.startedAt).toLocaleString()}
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
