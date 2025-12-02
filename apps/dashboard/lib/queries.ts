import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'

// Types - match API response format
export interface Project {
  id: string
  name: string
  widgetToken: string
  systemPrompt: string | null
  agentName: string | null
  createdAt: string
  updatedAt: string
  documentCount?: number
  conversationCount?: number
}

// Mapped type for UI (token alias)
export interface ProjectWithToken extends Omit<Project, 'widgetToken'> {
  token: string
  documentCount: number
  conversationCount: number
}

// Update project input
export interface UpdateProjectInput {
  name?: string
  systemPrompt?: string | null
  agentName?: string | null
}

// API response wrappers
interface ProjectsResponse {
  projects: Project[]
}

interface ProjectResponse {
  project: Project
}

interface DocumentsResponse {
  documents: Document[]
}

interface DocumentResponse {
  document: Document
}

interface ConversationsResponse {
  conversations: Conversation[]
}

interface ConversationResponse {
  conversation: ConversationDetail
}

export interface Document {
  id: string
  projectId: string
  filename: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  createdAt: string
}

export interface Conversation {
  id: string
  projectId: string
  sessionId: string
  turnCount: number
  startedAt: string
  firstQuery: string | null
}

export interface ConversationTurn {
  id: string
  conversationId: string
  userQuery: string
  agentResponse: string
  timestamp: string
}

export interface ConversationDetail extends Conversation {
  turns: ConversationTurn[]
}

// Helper to map project response to UI format
function mapProject(p: Project): ProjectWithToken {
  return {
    ...p,
    token: p.widgetToken,
    documentCount: p.documentCount ?? 0,
    conversationCount: p.conversationCount ?? 0,
  }
}

// Project hooks
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get<ProjectsResponse>('/projects')
      return res.projects.map(mapProject)
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await api.get<ProjectResponse>(`/projects/${id}`)
      return mapProject(res.project)
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await api.post<ProjectResponse>('/projects', data)
      return mapProject(res.project)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateProjectInput) => {
      const res = await api.patch<ProjectResponse>(`/projects/${id}`, data)
      return mapProject(res.project)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// Document hooks
export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const res = await api.get<DocumentsResponse>(`/projects/${projectId}/documents`)
      return res.documents
    },
    enabled: !!projectId,
  })
}

export function useUploadDocument(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.upload<DocumentResponse>(`/projects/${projectId}/documents`, formData)
      return res.document
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    },
  })
}

export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      api.delete(`/projects/${projectId}/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    },
  })
}

// Conversation hooks
export function useConversations(projectId: string) {
  return useQuery({
    queryKey: ['conversations', projectId],
    queryFn: async () => {
      const res = await api.get<ConversationsResponse>(`/projects/${projectId}/conversations`)
      return res.conversations
    },
    enabled: !!projectId,
  })
}

export function useConversation(projectId: string, conversationId: string) {
  return useQuery({
    queryKey: ['conversations', projectId, conversationId],
    queryFn: async () => {
      const res = await api.get<ConversationResponse>(`/conversations/${conversationId}`)
      return res.conversation
    },
    enabled: !!projectId && !!conversationId,
  })
}

// Form types
export interface FormField {
  name: string
  type: 'string' | 'email' | 'phone' | 'number' | 'enum' | 'text'
  label: string
  required: boolean
  options?: string[]
}

export interface FormSchema {
  id: string
  projectId: string
  name: string
  description: string | null
  fields: FormField[]
  triggerPhrases: string[]
  greetingMessage: string | null
  completionMessage: string | null
  webhookUrl: string | null
  webhookSecret: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  submissionCount?: number
}

export interface CreateFormInput {
  name: string
  description?: string
  fields: FormField[]
  triggerPhrases?: string[]
  greetingMessage?: string
  completionMessage?: string
  webhookUrl?: string
  webhookSecret?: string
  isActive?: boolean
}

export interface UpdateFormInput {
  name?: string
  description?: string
  fields?: FormField[]
  triggerPhrases?: string[]
  greetingMessage?: string
  completionMessage?: string
  webhookUrl?: string
  webhookSecret?: string
  isActive?: boolean
}

export interface FormSubmission {
  id: string
  formSchemaId: string
  sessionId: string
  data: Record<string, unknown>
  webhookSent: boolean
  createdAt: string
}

interface FormsResponse {
  forms: FormSchema[]
}

interface FormResponse {
  form: FormSchema
}

interface SubmissionsResponse {
  submissions: FormSubmission[]
}

// Form hooks
export function useForms(projectId: string) {
  return useQuery({
    queryKey: ['forms', projectId],
    queryFn: async () => {
      const res = await api.get<FormsResponse>(`/projects/${projectId}/forms`)
      return res.forms
    },
    enabled: !!projectId,
  })
}

export function useForm(projectId: string, formId: string) {
  return useQuery({
    queryKey: ['forms', projectId, formId],
    queryFn: async () => {
      const res = await api.get<FormResponse>(`/projects/${projectId}/forms/${formId}`)
      return res.form
    },
    enabled: !!projectId && !!formId,
  })
}

export function useCreateForm(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateFormInput) => {
      const res = await api.post<FormResponse>(`/projects/${projectId}/forms`, data)
      return res.form
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', projectId] })
    },
  })
}

export function useUpdateForm(projectId: string, formId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateFormInput) => {
      const res = await api.put<FormResponse>(`/projects/${projectId}/forms/${formId}`, data)
      return res.form
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', projectId] })
      queryClient.invalidateQueries({ queryKey: ['forms', projectId, formId] })
    },
  })
}

export function useDeleteForm(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formId: string) => api.delete(`/projects/${projectId}/forms/${formId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', projectId] })
    },
  })
}

export function useFormSubmissions(projectId: string, formId: string) {
  return useQuery({
    queryKey: ['submissions', projectId, formId],
    queryFn: async () => {
      const res = await api.get<SubmissionsResponse>(`/projects/${projectId}/forms/${formId}/submissions`)
      return res.submissions
    },
    enabled: !!projectId && !!formId,
  })
}

// Form Event types
export interface FormEvent {
  id: string
  formSchemaId: string
  eventType: 'activated' | 'field_collected' | 'submitted' | 'abandoned'
  fieldName: string | null
  fieldValue: string | null
  attemptCount: number | null
  metadata: Record<string, unknown> | null
  timestamp: string
}

interface FormEventsResponse {
  events: FormEvent[]
}

// Form Events hook
export function useFormEvents(conversationId: string) {
  return useQuery({
    queryKey: ['form-events', conversationId],
    queryFn: async () => {
      const res = await api.get<FormEventsResponse>(`/conversations/${conversationId}/form-events`)
      return res.events
    },
    enabled: !!conversationId,
  })
}
