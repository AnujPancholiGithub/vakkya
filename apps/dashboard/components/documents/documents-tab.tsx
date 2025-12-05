'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Trash2, FileText, Loader2, File } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/lib/queries'
import { DocumentStatusBadge } from './document-status-badge'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { getFileTypeIcon } from '@/lib/utils'

const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/markdown']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface DocumentsTabProps {
  projectId: string
}

function FileTypeIcon({ filename }: { filename: string }) {
  const type = getFileTypeIcon(filename)
  const iconClasses = 'h-4 w-4'

  switch (type) {
    case 'pdf':
      return <File className={`${iconClasses} text-red-500`} />
    case 'txt':
      return <FileText className={`${iconClasses} text-blue-500`} />
    case 'md':
      return <FileText className={`${iconClasses} text-purple-500`} />
    default:
      return <FileText className={`${iconClasses} text-muted-foreground`} />
  }
}

export function DocumentsTab({ projectId }: DocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const { data: documents, isLoading } = useDocuments(projectId)
  const uploadDocument = useUploadDocument(projectId)
  const deleteDocument = useDeleteDocument(projectId)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
      return 'Only PDF, TXT, and MD files are allowed'
    }
    if (file.size > MAX_SIZE) {
      return 'File must be less than 10MB'
    }
    return null
  }

  const handleUpload = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setUploadingFileName(file.name)
    try {
      await uploadDocument.mutateAsync(file)
      toast.success(`"${file.name}" uploaded successfully`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error occurred'
      toast.error(
        `Failed to upload "${file.name}": ${message}. Please try again.`
      )
    } finally {
      setUploadingFileName(null)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await handleUpload(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) {
        await handleUpload(file)
      }
    },
    [handleUpload]
  )

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isUploading = uploadDocument.isPending || uploadingFileName !== null
  const hasDocuments = documents && documents.length > 0

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload progress */}
      {uploadingFileName && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">
            Uploading <span className="font-medium">{uploadingFileName}</span>
          </span>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Drop file here</p>
          </div>
        </div>
      )}

      {hasDocuments ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  File
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Added
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents?.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileTypeIcon filename={doc.filename} />
                      <span className="text-sm">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DocumentStatusBadge
                      status={doc.status}
                      error={doc.errorMessage}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteDocId(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Add more button */}
          <div className="border-t bg-muted/30 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-muted-foreground"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Add document
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <div className="flex justify-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-red-500/10">
              <File className="h-5 w-5 text-red-500" />
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="font-medium mb-1">Drop files here or click to upload</p>
          <p className="text-sm text-muted-foreground mb-4">
            PDF, TXT, or Markdown up to 10MB
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Choose File
          </Button>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteDocId}
        onOpenChange={(open: boolean) => !open && setDeleteDocId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="This will remove the document from your knowledge base. This cannot be undone."
        isLoading={deleteDocument.isPending}
      />
    </div>
  )
}
