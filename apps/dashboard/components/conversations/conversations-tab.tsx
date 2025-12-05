'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useConversations } from '@/lib/queries'
import { truncateText, formatRelativeTime } from '@/lib/utils'

const PAGE_SIZE = 10

interface ConversationsTabProps {
  projectId: string
}

export function ConversationsTab({ projectId }: ConversationsTabProps) {
  const { data: conversations, isLoading } = useConversations(projectId)
  const [page, setPage] = useState(1)

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
  const totalPages = Math.ceil(totalConversations / PAGE_SIZE)
  const startIndex = (page - 1) * PAGE_SIZE
  const paginatedConversations = conversations?.slice(startIndex, startIndex + PAGE_SIZE) ?? []

  return (
    <Card>
      <CardContent className="p-0">
        {conversations?.length === 0 ? (
          <div className="p-6">
            <div className="border border-dashed rounded-lg">
              <EmptyState
                illustration="conversations"
                title="No conversations yet"
                description="When users interact with your embedded widget, their conversations will appear here. You'll be able to review transcripts, see what questions are being asked, and improve your agent's responses."
                secondaryAction={{
                  label: 'Learn about the widget',
                  href: 'https://docs.vakkya.com/widget',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border-b">
              <div className="grid grid-cols-[1fr,100px,150px,50px] gap-4 px-6 py-3 border-b bg-muted/40 text-sm font-medium text-muted-foreground">
                <div>Query / Session</div>
                <div className="text-center">Turns</div>
                <div className="text-right">Date</div>
                <div className="text-right"></div>
              </div>
              <div className="divide-y">
                {paginatedConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/projects/${projectId}/conversations/${conv.id}`}
                    className="grid grid-cols-[1fr,100px,150px,50px] gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conv.firstQuery ? (
                          truncateText(conv.firstQuery, 80)
                        ) : (
                          <span className="text-muted-foreground italic">No query recorded</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                        {conv.sessionId}
                      </p>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                        <MessageSquare className="h-3 w-3" />
                        {conv.turnCount}
                      </span>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatRelativeTime(conv.startedAt)}
                    </div>
                    <div className="flex justify-end">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 pb-6">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, totalConversations)} of {totalConversations}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
