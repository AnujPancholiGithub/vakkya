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
