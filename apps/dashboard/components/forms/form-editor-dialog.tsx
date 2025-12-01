'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateForm, useUpdateForm, type FormField, type FormSchema } from '@/lib/queries'

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'enum', label: 'Select' },
  { value: 'text', label: 'Long Text' },
] as const

interface FormEditorDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  form?: FormSchema
}

export function FormEditorDialog({ projectId, open, onOpenChange, form }: FormEditorDialogProps) {
  const createForm = useCreateForm(projectId)
  const updateForm = useUpdateForm(projectId, form?.id ?? '')
  const isEditing = !!form

  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [fields, setFields] = useState<FormField[]>([])

  useEffect(() => {
    if (form) {
      setName(form.name)
      setWebhookUrl(form.webhookUrl || '')
      setFields(form.fields)
    } else {
      setName('')
      setWebhookUrl('')
      setFields([{ name: 'email', type: 'email', label: 'Email', required: true }])
    }
  }, [form, open])

  const addField = () => {
    const fieldNum = fields.length + 1
    setFields([...fields, { name: `field${fieldNum}`, type: 'string', label: `Field ${fieldNum}`, required: true }])
  }

  const removeField = (index: number) => {
    if (fields.length <= 1) {
      toast.error('Form must have at least one field')
      return
    }
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Form name is required')
      return
    }
    if (fields.length === 0) {
      toast.error('Add at least one field')
      return
    }

    // Validate enum fields have options
    for (const field of fields) {
      if (field.type === 'enum' && (!field.options || field.options.length === 0)) {
        toast.error(`Field "${field.label}" needs at least one option`)
        return
      }
    }

    try {
      const data = {
        name: name.trim(),
        fields,
        webhookUrl: webhookUrl.trim() || undefined,
      }

      if (isEditing) {
        await updateForm.mutateAsync(data)
        toast.success('Form updated')
      } else {
        await createForm.mutateAsync(data)
        toast.success('Form created')
      }
      onOpenChange(false)
    } catch {
      toast.error(isEditing ? 'Failed to update form' : 'Failed to create form')
    }
  }

  const isPending = createForm.isPending || updateForm.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Form' : 'Create Form'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update your form fields and settings' : 'Define the fields for your conversational form'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Form Name */}
            <div className="space-y-2">
              <Label htmlFor="formName">Form Name</Label>
              <Input
                id="formName"
                placeholder="e.g., Contact Form"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button type="button" variant="outline" size="sm" onClick={addField} disabled={isPending}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <FieldEditor
                    key={index}
                    field={field}
                    onChange={(updates) => updateField(index, updates)}
                    onRemove={() => removeField(index)}
                    disabled={isPending}
                  />
                ))}
              </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://hooks.zapier.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Submissions will be sent to this URL via POST request
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Form'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface FieldEditorProps {
  field: FormField
  onChange: (updates: Partial<FormField>) => void
  onRemove: () => void
  disabled?: boolean
}

function FieldEditor({ field, onChange, onRemove, disabled }: FieldEditorProps) {
  const [optionsText, setOptionsText] = useState(field.options?.join(', ') || '')

  const handleOptionsChange = (text: string) => {
    setOptionsText(text)
    const options = text.split(',').map(o => o.trim()).filter(Boolean)
    onChange({ options: options.length > 0 ? options : undefined })
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-start gap-2">
        <GripVertical className="h-5 w-5 text-muted-foreground mt-2.5 cursor-grab" />
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Input
            placeholder="Label"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            disabled={disabled}
          />
          <select
            className="flex h-10 w-full rounded-md px-3 py-2 bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={field.type}
            onChange={(e) => onChange({ type: e.target.value as FormField['type'] })}
            disabled={disabled}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={onRemove} disabled={disabled}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      {field.type === 'enum' && (
        <div className="ml-7">
          <Input
            placeholder="Options (comma-separated): Option 1, Option 2, Option 3"
            value={optionsText}
            onChange={(e) => handleOptionsChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      <div className="ml-7 flex items-center gap-2">
        <input
          type="checkbox"
          id={`required-${field.name}`}
          checked={field.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          disabled={disabled}
          className="rounded border-zinc-700"
        />
        <label htmlFor={`required-${field.name}`} className="text-sm text-muted-foreground">
          Required
        </label>
      </div>
    </div>
  )
}
