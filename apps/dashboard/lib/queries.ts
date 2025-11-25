import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'

// Types
export interface Project {
  id: string
  userId: string
  name: string
  token: string
  createdAt: string
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

// Project hooks
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => api.post<Project>('/projects', data),
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

// Document hooks
export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => api.get<Document[]>(`/projects/${projectId}/documents`),
    enabled: !!projectId,
  })
}

export function useUploadDocument(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.upload<Document>(`/projects/${projectId}/documents`, formData)
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
    queryFn: () => api.get<Conversation[]>(`/projects/${projectId}/conversations`),
    enabled: !!projectId,
  })
}

export function useConversation(projectId: string, conversationId: string) {
  return useQuery({
    queryKey: ['conversations', projectId, conversationId],
    queryFn: () =>
      api.get<ConversationDetail>(`/conversations/${conversationId}`),
    enabled: !!projectId && !!conversationId,
  })
}
