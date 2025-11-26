'use client'

import { useRef, useState } from 'react'
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/lib/queries'
import { DocumentStatusBadge } from './document-status-badge'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'

const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/markdown']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface DocumentsTabProps {
  projectId: string
}

export function DocumentsTab({ projectId }: DocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
  const { data: documents, isLoading } = useDocuments(projectId)
  const uploadDocument = useUploadDocument(projectId)
  const deleteDocument = useDeleteDocument(projectId)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error('Only PDF, TXT, and MD files are allowed')
      return
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      toast.error('File must be less than 10MB')
      return
    }

    try {
      await uploadDocument.mutateAsync(file)
      toast.success('Document uploaded successfully')
    } catch {
      toast.error('Failed to upload document')
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!deleteDocId) return
    try {
      await deleteDocument.mutateAsync(deleteDocId)
      toast.success('Document deleted')
      setDeleteDocId(null)
    } catch {
      toast.error('Failed to delete document')
    }
  }

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
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Upload documents to train your voice agent
          </p>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocument.isPending}
            >
              {uploadDocument.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Document
            </Button>
          </div>
        </div>

        {documents?.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents yet</p>
            <p className="text-sm text-muted-foreground">
              Upload PDF, TXT, or MD files to get started
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Filename</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents?.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 text-sm">{doc.filename}</td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={doc.status} error={doc.errorMessage} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDocId(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <DeleteConfirmDialog
        open={!!deleteDocId}
        onOpenChange={(open: boolean) => !open && setDeleteDocId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        isLoading={deleteDocument.isPending}
      />
    </Card>
  )
}
