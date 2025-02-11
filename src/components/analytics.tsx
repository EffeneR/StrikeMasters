'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { 
  GameEvent, 
  GameEventType, 
  MatchStats, 
  CombatResult,
  GameState 
} from '@/types/game'

export function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
    trackPageView(url)
  }, [pathname, searchParams])

  return null
}

// Analytics tracking functions
export function trackPageView(url: string) {
  console.info('Page View:', url)
}

export function trackGameEvent(event: GameEvent) {
  console.info('Game Event:', {
    type: event.type,
    timestamp: event.timestamp,
    round: event.round,
    location: event.location,
    impact: event.impact,
    data: event.data
  })
}

export function trackMatchStats(stats: MatchStats) {
  console.info('Match Stats:', {
    kills: stats.kills,
    deaths: stats.deaths,
    assists: stats.assists,
    utilityDamage: stats.utilityDamage,
    flashAssists: stats.flashAssists,
    headshotPercentage: stats.headshotPercentage,
    damagePerRound: stats.damagePerRound
  })
}

export function trackCombatResult(result: CombatResult) {
  console.info('Combat Result:', {
    type: result.type,
    killerId: result.killerId,
    victimId: result.victimId,
    weapon: result.weapon,
    damage: result.damage,
    isHeadshot: result.isHeadshot,
    throughSmoke: result.throughSmoke
  })
}

export function trackGameState(state: GameState) {
  console.info('Game State Update:', {
    matchStatus: state.match.status,
    round: state.round.phase,
    score: state.match.score
  })
}