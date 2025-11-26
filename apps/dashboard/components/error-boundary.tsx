'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset?: () => void
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const message = getUserFriendlyMessage(error)

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            {onReset && (
              <Button onClick={onReset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getUserFriendlyMessage(error: Error | null): string {
  if (!error) return 'An unexpected error occurred. Please try again.'

  const message = error.message.toLowerCase()

  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.'
  }

  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.'
  }

  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Your session has expired. Please log in again.'
  }

  if (message.includes('forbidden') || message.includes('403')) {
    return 'You don\'t have permission to access this resource.'
  }

  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.'
  }

  if (message.includes('500') || message.includes('server')) {
    return 'A server error occurred. Please try again later.'
  }

  return 'An unexpected error occurred. Please try again.'
}
