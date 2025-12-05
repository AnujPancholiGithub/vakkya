'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Loader2, X, MessageSquare, Webhook, FileText, Settings, Sparkles } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCreateForm, useUpdateForm, type FormField, type FormSchema } from '@/lib/queries'
import { cn } from '@/lib/utils'

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

  // Basic fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  
  // V2 fields
  const [triggerPhrases, setTriggerPhrases] = useState<string[]>([])
  const [triggerInput, setTriggerInput] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (form) {
      setName(form.name)
      setDescription(form.description || '')
      setFields(form.fields)
      setTriggerPhrases(form.triggerPhrases || [])
      setTriggerInput('')
      setGreetingMessage(form.greetingMessage || '')
      setCompletionMessage(form.completionMessage || '')
      setWebhookUrl(form.webhookUrl || '')
      setWebhookSecret(form.webhookSecret || '')
      setIsActive(form.isActive ?? true)
    } else {
      setName('')
      setDescription('')
      setFields([{ name: 'email', type: 'email', label: 'Email', required: true }])
      setTriggerPhrases([])
      setTriggerInput('')
      setGreetingMessage('')
      setCompletionMessage('')
      setWebhookUrl('')
      setWebhookSecret('')
      setIsActive(true)
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

  const addTriggerPhrase = () => {
    const phrase = triggerInput.trim()
    if (!phrase) return
    if (triggerPhrases.includes(phrase)) {
      toast.error('Trigger phrase already added')
      return
    }
    setTriggerPhrases([...triggerPhrases, phrase])
    setTriggerInput('')
  }

  const removeTriggerPhrase = (index: number) => {
    setTriggerPhrases(triggerPhrases.filter((_, i) => i !== index))
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTriggerPhrase()
    }
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
        description: description.trim() || undefined,
        fields,
        triggerPhrases: triggerPhrases.length > 0 ? triggerPhrases : undefined,
        greetingMessage: greetingMessage.trim() || undefined,
        completionMessage: completionMessage.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
        isActive,
      }

      if (isEditing) {
        await updateForm.mutateAsync(data)
        toast.success('Form updated')
      } else {
        await createForm.mutateAsync(data)
        toast.success('Form created')
      }
      onOpenChange(false)
    } catch (err) {
      // Check for trigger phrase conflict error
      if (err instanceof Error && err.message.includes('TRIGGER_PHRASE_CONFLICT')) {
        toast.error('Trigger phrase already used by another form')
        return
      }
      toast.error(isEditing ? 'Failed to update form' : 'Failed to create form')
    }
  }

  const isPending = createForm.isPending || updateForm.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{isEditing ? 'Edit Form' : 'Create Form'}</DialogTitle>
                  <DialogDescription className="mt-1">
                    {isEditing ? 'Update your form fields and settings' : 'Define the fields for your conversational form'}
                  </DialogDescription>
                </div>
                 <div className="flex items-center gap-3">
                    <div className="relative flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full">
                        <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-neutral-500")} />
                        <span className="text-xs font-medium text-muted-foreground">{isActive ? 'Active' : 'Inactive'}</span>
                        <input
                            type="checkbox"
                            className="absolute opacity-0 w-full h-full cursor-pointer inset-0 z-10"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            title="Toggle Active State"
                        />
                    </div>
                </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="builder" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b border-border bg-background shrink-0">
                <TabsList className="h-10 bg-transparent p-0 gap-6">
                    <TabsTrigger 
                        value="builder" 
                        className="h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none !shadow-none"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Builder
                    </TabsTrigger>
                    <TabsTrigger 
                        value="settings" 
                        className="h-10 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none !shadow-none"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Configuration
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
                 {/* Builder Tab */}
                <TabsContent value="builder" className="space-y-8 mt-0 h-full border-none data-[state=active]:block hidden">
                   <div className="grid gap-6 max-w-2xl mx-auto">
                        {/* Basic Info */}
                        <div className="grid gap-4 p-4 border border-border rounded-xl bg-background/50">
                            <div className="space-y-2">
                                <Label htmlFor="formName">Form Name</Label>
                                <Input
                                    id="formName"
                                    placeholder="e.g., Contact Form"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isPending}
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    placeholder="Help the agent understand when to use this form..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isPending}
                                    className="bg-background"
                                />
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Form Fields</Label>
                                <span className="text-xs text-muted-foreground">{fields.length} fields configured</span>
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

                             <Button 
                                type="button" 
                                variant="outline" 
                                size="lg" 
                                onClick={addField} 
                                disabled={isPending}
                                className="w-full border-dashed h-12"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Field
                            </Button>
                        </div>
                   </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-8 mt-0 h-full border-none data-[state=active]:block hidden">
                    <div className="grid gap-8 max-w-2xl mx-auto">
                        
                        {/* Activation */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <h3 className="font-semibold">Activation</h3>
                            </div>
                            <div className="space-y-2">
                                <Label>Trigger Phrases</Label>
                                <p className="text-xs text-muted-foreground mb-2">Natural language phrases that will prompt the agent to start this form.</p>
                                <div className="flex gap-2">
                                    <Input
                                    placeholder="e.g., I want to contact you"
                                    value={triggerInput}
                                    onChange={(e) => setTriggerInput(e.target.value)}
                                    onKeyDown={handleTriggerKeyDown}
                                    disabled={isPending}
                                    className="bg-background"
                                    />
                                    <Button type="button" variant="outline" onClick={addTriggerPhrase} disabled={isPending || !triggerInput.trim()}>
                                    Add
                                    </Button>
                                </div>
                                {triggerPhrases.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/40 rounded-lg border border-border">
                                    {triggerPhrases.map((phrase, index) => (
                                        <span
                                        key={index}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-md text-xs"
                                        >
                                        {phrase}
                                        <button
                                            type="button"
                                            onClick={() => removeTriggerPhrase(index)}
                                            className="hover:text-destructive ml-1"
                                            disabled={isPending}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        </span>
                                    ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Conversation Flow */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <MessageSquare className="w-4 h-4 text-blue-400" />
                                <h3 className="font-semibold">Conversation Flow</h3>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="greetingMessage">Greeting Message</Label>
                                    <textarea
                                        id="greetingMessage"
                                        className="flex min-h-[80px] w-full rounded-md px-3 py-2 bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        placeholder="Hello! I'd be happy to help you with that..."
                                        value={greetingMessage}
                                        onChange={(e) => setGreetingMessage(e.target.value)}
                                        disabled={isPending}
                                        maxLength={500}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="completionMessage">Completion Message</Label>
                                    <textarea
                                        id="completionMessage"
                                        className="flex min-h-[80px] w-full rounded-md px-3 py-2 bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        placeholder="Thank you! We've received your information..."
                                        value={completionMessage}
                                        onChange={(e) => setCompletionMessage(e.target.value)}
                                        disabled={isPending}
                                        maxLength={500}
                                    />
                                </div>
                            </div>
                        </div>

                         {/* Webhooks */}
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <Webhook className="w-4 h-4 text-green-400" />
                                <h3 className="font-semibold">Webhooks</h3>
                            </div>
                            <div className="grid gap-4 p-4 border border-border rounded-xl bg-background/50">
                                <div className="space-y-2">
                                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                                    <Input
                                        id="webhookUrl"
                                        type="url"
                                        placeholder="https://hooks.zapier.com/..."
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        disabled={isPending}
                                        className="bg-background font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="webhookSecret">Webhook Secret</Label>
                                    <Input
                                        id="webhookSecret"
                                        type="password"
                                        placeholder="Signing secret..."
                                        value={webhookSecret}
                                        onChange={(e) => setWebhookSecret(e.target.value)}
                                        disabled={isPending}
                                        className="bg-background font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
             <div className="flex items-center justify-end gap-2 w-full">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {isEditing ? 'Save Changes' : 'Create Form'}
                </Button>
             </div>
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
    <div className="group border border-border rounded-xl p-4 space-y-4 bg-background hover:border-primary/50 transition-colors shadow-sm">
      <div className="flex items-start gap-3">
        <GripVertical className="h-5 w-5 text-muted-foreground/30 mt-2.5 cursor-grab group-hover:text-muted-foreground transition-colors" />
        <div className="flex-1 grid md:grid-cols-2 gap-4">
           {/* Label Input */}
           <div>
             <Label className="text-xs text-muted-foreground mb-1 block">Label</Label>
             <Input
                placeholder="e.g. Full Name"
                value={field.label}
                onChange={(e) => onChange({ label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                disabled={disabled}
                className="h-9"
            />
           </div>
          
           {/* Type Select */}
           <div>
             <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
             <select
                className="flex h-9 w-full rounded-md px-3 py-1 bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={field.type}
                onChange={(e) => onChange({ type: e.target.value as FormField['type'] })}
                disabled={disabled}
            >
                {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
                ))}
            </select>
           </div>
        </div>
        
        <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-[22px]" 
            onClick={onRemove} 
            disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {field.type === 'enum' && (
        <div className="pl-8">
            <Label className="text-xs text-muted-foreground mb-1 block">Options</Label>
           <Input
            placeholder="Option 1, Option 2, Option 3"
            value={optionsText}
            onChange={(e) => handleOptionsChange(e.target.value)}
            disabled={disabled}
            className="h-9 font-mono text-xs"
          />
        </div>
      )}

      <div className="pl-8 flex items-center gap-2">
        <input
          type="checkbox"
          id={`required-${field.name}`}
          checked={field.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          disabled={disabled}
          className="rounded border-input h-4 w-4"
        />
        <label htmlFor={`required-${field.name}`} className="text-sm text-foreground cursor-pointer select-none">
          Required Field
        </label>
      </div>
    </div>
  )
}
