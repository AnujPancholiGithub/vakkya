'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Loader2, ClipboardList, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useForms, useDeleteForm } from '@/lib/queries'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { FormEditorDialog } from '@/components/forms/form-editor-dialog'

export default function FormsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { data: forms, isLoading } = useForms(projectId)
  const deleteForm = useDeleteForm(projectId)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteFormId) return
    try {
      await deleteForm.mutateAsync(deleteFormId)
      toast.success('Form deleted')
      setDeleteFormId(null)
    } catch {
      toast.error('Failed to delete form')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Forms</h1>
          <p className="text-sm text-muted-foreground">
            Create conversational forms for lead capture
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Form
        </Button>
      </div>

      {forms?.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6 text-muted-foreground" />}
          title="No forms yet"
          description="Create a form to collect leads through voice conversations"
          action={{
            label: 'Create Form',
            onClick: () => setShowCreateDialog(true),
          }}
        />
      ) : (
        <div className="grid gap-4">
          {forms?.map((form) => (
            <Card key={form.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{form.name}</CardTitle>
                    <CardDescription>
                      {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} · {form.submissionCount ?? 0} submission{(form.submissionCount ?? 0) !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/projects/${projectId}/forms/${form.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteFormId(form.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {form.fields.slice(0, 5).map((field) => (
                    <span
                      key={field.name}
                      className="text-xs px-2 py-1 bg-muted rounded-md"
                    >
                      {field.label}
                    </span>
                  ))}
                  {form.fields.length > 5 && (
                    <span className="text-xs px-2 py-1 text-muted-foreground">
                      +{form.fields.length - 5} more
                    </span>
                  )}
                </div>
                {form.webhookUrl && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    Webhook: {form.webhookUrl}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormEditorDialog
        projectId={projectId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <DeleteConfirmDialog
        open={!!deleteFormId}
        onOpenChange={(open) => !open && setDeleteFormId(null)}
        onConfirm={handleDelete}
        title="Delete Form"
        description="This will permanently delete this form and all its submissions. This cannot be undone."
        isLoading={deleteForm.isPending}
      />
    </div>
  )
}
