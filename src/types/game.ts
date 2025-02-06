// src/types/game.ts

export interface Position {
  x: number;
  y: number;
}

export interface AgentStats {
  aim: number;
  reaction: number;
  positioning: number;
  utility: number;
  leadership: number;
  clutch: number;
}

export interface MatchStats {
  kills: number;
  deaths: number;
  assists: number;
  utilityDamage: number;
  flashAssists: number;
}

export interface StrategyStats {
  utilityUsage: number;
  positioningScore: number;
  strategyAdherence: number;
  impactRating: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: Team;
  position: Position;
  isAlive: boolean;
  health: number;
  armor: number;
  weapons: string[];
  equipment: string[];
  stats: AgentStats;
  matchStats: MatchStats;
  strategyStats: StrategyStats;
}

export interface TeamStrategyStats {
  roundsWonWithStrategy: { [key: string]: number };
  strategySuccessRate: number;
  lastSuccessfulStrategy: string;
}

export interface Team {
  money: number;
  roundWins: number;
  lossBonus: number;
  timeoutAvailable: boolean;
  strategy: string;
  agents: Agent[];
  strategyStats: TeamStrategyStats;
}

export interface MatchState {
  id: string;
  status: MatchStatus;
  currentRound: number;
  maxRounds: number;
  score: { t: number; ct: number };
  winner: Team | null;
  startTime: number | null;
  endTime: number | null;
}

export interface RoundState {
  phase: RoundPhase;
  timeLeft: number;
  bombPlanted: boolean;
  bombSite: 'A' | 'B' | null;
  plantTime: number | null;
  winner: Team | null;
  endReason: string | null;
  currentStrategy: {
      t: string;
      ct: string;
  };
  activeCall: string | null;
}

export interface GameState {
  match: MatchState;
  round: RoundState;
  teams: {
      t: Team;
      ct: Team;
  };
  events: GameEvent[];
  combatResult: CombatResult | null;
}

export interface GameEvent {
  type: GameEventType;
  data: any;
  timestamp: number;
}

export interface GameConfig {
  maxRounds: number;
  startingSide: Team;
  initialStrategy: string;
  difficulty: GameDifficulty;
  matchId: string;
}

export interface LoadoutConfig {
  weapons: string[];
  equipment: string[];
  total: number;
}

export interface CombatResult {
  type: 'kill' | 'damage' | 'utility';
  killerId?: string;
  victimId?: string;
  weapon?: string;
  damage?: number;
  timestamp: number;
}

export type Team = 't' | 'ct';
export type MatchStatus = 'pending' | 'active' | 'paused' | 'ended';
export type RoundPhase = 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
export type GameEventType = 'kill' | 'damage' | 'plant' | 'defuse' | 'round_start' | 'round_end' | 'match_end';
export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type StateListener = (state: GameState) => void;

export interface SystemError {
  code: string;
  message: string;
  timestamp: number;
}

export interface GameSystemState {
  isInitialized: boolean;
  hasError: boolean;
  lastError: SystemError | null;
}