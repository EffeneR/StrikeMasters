'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'
import { GameDifficulty } from '@/types/game'

type Theme = 'dark' | 'light' | 'system'

interface GameThemeContext {
  theme: Theme
  setTheme: (theme: Theme) => void
  difficulty: GameDifficulty
  setDifficulty: (difficulty: GameDifficulty) => void
  isLoaded: boolean
}

const GameThemeContext = createContext<GameThemeContext>({
  theme: 'system',
  setTheme: () => null,
  difficulty: 'medium',
  setDifficulty: () => null,
  isLoaded: false,
})

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium')

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      <GameThemeContext.Provider 
        value={{
          theme: 'system',
          setTheme: () => null,
          difficulty,
          setDifficulty,
          isLoaded
        }}
      >
        {children}
      </GameThemeContext.Provider>
    </NextThemesProvider>
  )
}

export function useGameTheme() {
  const context = useContext(GameThemeContext)
  if (!context) {
    throw new Error('useGameTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme configuration based on game difficulty
export const difficultyThemes: Record<GameDifficulty, any> = {
  easy: {
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      background: 'hsl(var(--background))',
    },
    ui: {
      hudOpacity: 0.9,
      showHints: true,
      showWarnings: true
    }
  },
  medium: {
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      background: 'hsl(var(--background))',
    },
    ui: {
      hudOpacity: 0.7,
      showHints: true,
      showWarnings: false
    }
  },
  hard: {
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      background: 'hsl(var(--background))',
    },
    ui: {
      hudOpacity: 0.5,
      showHints: false,
      showWarnings: false
    }
  },
  expert: {
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      background: 'hsl(var(--background))',
    },
    ui: {
      hudOpacity: 0.3,
      showHints: false,
      showWarnings: false
    }
  }
}