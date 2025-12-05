'use client'

import { Copy, Check, X, Calendar, MessageSquare, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { FormSubmission } from '@/lib/queries'

interface SubmissionDetailDialogProps {
  submission: FormSubmission | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubmissionDetailDialog({ submission, open, onOpenChange }: SubmissionDetailDialogProps) {
  if (!submission) return null

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
          <DialogDescription>
             Full response data and metadata
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Submitted At
                        </span>
                        <p className="font-medium">{new Date(submission.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                         <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <Webhook className="h-3 w-3" /> Webhook Status
                        </span>
                        <div className={cn(badgeVariants({ variant: "outline" }), "gap-1 h-6 pl-1 pr-2")}>
                             {submission.webhookSent ? (
                                <>
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    <span className="text-green-600">Delivered</span>
                                </>
                             ) : (
                                <>
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span className="text-amber-600">Failed / Not Configured</span>
                                </>
                             )}
                        </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                         <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Session ID
                        </span>
                        <div className="flex items-center gap-2 group">
                             <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{submission.sessionId}</code>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => copyToClipboard(submission.sessionId, 'Session ID')}
                             >
                                <Copy className="h-3 w-3" />
                             </Button>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Data List */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Form Data</h3>
                    <dl className="grid gap-4">
                        {Object.entries(submission.data).map(([key, value]) => (
                            <div key={key} className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">
                                    {key.replace(/_/g, ' ')}
                                </dt>
                                <dd className="text-sm font-medium break-words leading-relaxed select-text">
                                    {String(value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
                
                {/* JSON View (Optional, nice for devs) */}
                 <div className="space-y-2">
                     <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Raw JSON</h3>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs gap-1"
                            onClick={() => copyToClipboard(JSON.stringify(submission.data, null, 2), 'JSON')}
                        >
                            <Copy className="h-3 w-3" /> Copy
                         </Button>
                     </div>
                    <pre className="text-[10px] bg-muted p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground">
                        {JSON.stringify(submission.data, null, 2)}
                    </pre>
                </div>

            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
