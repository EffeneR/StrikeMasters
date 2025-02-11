'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { SystemError, GameSystemState } from '@/types/game'

interface Props {
  children?: ReactNode
  onError?: (error: SystemError) => void
}

interface State {
  hasError: boolean
  error?: SystemError
  systemState: Partial<GameSystemState>
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    systemState: {
      isInitialized: true,
      hasError: false,
      lastError: null,
      performance: {
        fps: 0,
        ping: 0,
        tickRate: 0
      }
    }
  }

  public static getDerivedStateFromError(error: Error): State {
    const systemError: SystemError = {
      code: 'GAME_ERROR',
      message: error.message,
      timestamp: Date.now(),
      severity: 'high',
      context: error.stack
    }

    return {
      hasError: true,
      error: systemError,
      systemState: {
        isInitialized: false,
        hasError: true,
        lastError: systemError,
        performance: {
          fps: 0,
          ping: 0,
          tickRate: 0
        }
      }
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const systemError: SystemError = {
      code: 'GAME_ERROR',
      message: error.message,
      timestamp: Date.now(),
      severity: 'high',
      context: {
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }
    }

    this.props.onError?.(systemError)
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      systemState: {
        isInitialized: true,
        hasError: false,
        lastError: null
      }
    })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
          <h1 className="text-2xl font-bold text-primary">Strike Masters Error</h1>
          <div className="rounded-lg bg-card p-4 shadow-lg">
            <p className="text-destructive">Error Code: {this.state.error?.code}</p>
            <p className="mt-2 text-muted-foreground">{this.state.error?.message}</p>
            {this.state.error?.severity === 'high' && (
              <p className="mt-2 text-warning">Critical System Error</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="default">
              Restart Game
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Return to Menu
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}