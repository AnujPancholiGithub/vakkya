'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Loader2, Check, X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm, useFormSubmissions, useDeleteForm } from '@/lib/queries'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormEditorDialog } from '@/components/forms/form-editor-dialog'
import { SubmissionDetailDialog } from '@/components/forms/submission-detail-dialog'
import { type FormSubmission } from '@/lib/queries'

export default function FormDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const formId = params.formId as string
  
  const { data: form, isLoading: formLoading } = useForm(projectId, formId)
  const { data: submissions, isLoading: submissionsLoading } = useFormSubmissions(projectId, formId)
  const deleteForm = useDeleteForm(projectId)
  
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)

  const handleDelete = async () => {
    try {
      await deleteForm.mutateAsync(formId)
      toast.success('Form deleted')
      router.push(`/projects/${projectId}/forms`)
    } catch {
      toast.error('Failed to delete form')
    }
  }

  const handleTestWebhook = async () => {
    if (!form?.webhookUrl) {
      toast.error('No webhook URL configured')
      return
    }
    
    try {
      const testPayload = {
        event: 'form.test',
        timestamp: new Date().toISOString(),
        data: Object.fromEntries(form.fields.map(f => [f.name, `test_${f.type}`])),
        metadata: { formId: form.id, formName: form.name, test: true },
      }
      
      const response = await fetch(form.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      })
      
      if (response.ok) {
        toast.success('Test webhook sent successfully')
      } else {
        toast.error(`Webhook returned ${response.status}`)
      }
    } catch {
      toast.error('Failed to send test webhook')
    }
  }

  if (formLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Form not found</p>
        <Link href={`/projects/${projectId}/forms`}>
          <Button variant="link">Back to Forms</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/forms`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{form.name}</h1>
            <p className="text-sm text-muted-foreground">
              {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} · {submissions?.length ?? 0} submission{(submissions?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Form Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form Fields</CardTitle>
          <CardDescription>Fields collected by this form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {form.fields.map((field, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                <span className="text-xs font-mono text-muted-foreground w-6">{index + 1}</span>
                <span className="font-medium flex-1">{field.label}</span>
                <span className="text-xs px-2 py-0.5 bg-background rounded">{field.type}</span>
                {field.required && (
                  <span className="text-xs text-amber-500">Required</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook */}
      {form.webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook</CardTitle>
            <CardDescription>Submissions are sent to this URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <code className="block text-xs bg-muted p-2 rounded-md truncate">
              {form.webhookUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleTestWebhook}>
              <Send className="h-4 w-4 mr-1.5" />
              Send Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
          <CardDescription>Form responses from voice conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {submissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : submissions?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submissions will appear here when users complete the form
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">
                      Date
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">
                      Data
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">
                      Webhook
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions?.map((sub) => (
                    <tr 
                        key={sub.id} 
                        className="hover:bg-muted/50 w-full transition-colors cursor-pointer"
                        onClick={() => setSelectedSubmission(sub)}
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(sub.data).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="text-xs px-2 py-0.5 bg-muted rounded">
                              {key}: {String(value).slice(0, 20)}{String(value).length > 20 ? '...' : ''}
                            </span>
                          ))}
                          {Object.keys(sub.data).length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{Object.keys(sub.data).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {sub.webhookSent ? (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <Check className="h-3 w-3" /> Sent
                          </span>
                        ) : form.webhookUrl ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <X className="h-3 w-3" /> Failed
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <FormEditorDialog
        projectId={projectId}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        form={form}
      />

      <SubmissionDetailDialog 
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Form"
        description="This will permanently delete this form and all its submissions. This cannot be undone."
        isLoading={deleteForm.isPending}
      />
    </div>
  )
}
