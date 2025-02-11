// src/types/game.ts

// Base Types
export type Team = 't' | 'ct';
export type MatchStatus = 'pending' | 'active' | 'paused' | 'ended';
export type RoundPhase = 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
export type GameEventType = 'kill' | 'damage' | 'plant' | 'defuse' | 'round_start' | 'round_end' | 'match_end' | 'strategy_change' | 'economy_update';
export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type StateListener = (state: GameState) => void;
export type WeaponType = 'pistol' | 'smg' | 'rifle' | 'sniper' | 'heavy';
export type UtilityType = 'flash' | 'smoke' | 'molotov' | 'he' | 'decoy';
export type MapArea = 'A' | 'B' | 'Mid' | 'T_Spawn' | 'CT_Spawn';
export type StrategyType = 'default' | 'rush' | 'split' | 'execute' | 'hold' | 'retake';

// Enhanced Position Interface
export interface Position {
  x: number;
  y: number;
  angle?: number;
  area?: MapArea;
  elevation?: number;
}

// Enhanced Agent Stats
export interface AgentStats {
  aim: number;
  reaction: number;
  positioning: number;
  utility: number;
  leadership: number;
  clutch: number;
  gameAwareness?: number;
  economyManagement?: number;
  teamwork?: number;
}

// Enhanced Match Stats
export interface MatchStats {
  kills: number;
  deaths: number;
  assists: number;
  utilityDamage: number;
  flashAssists: number;
  headshotPercentage?: number;
  damagePerRound?: number;
  tradingSuccess?: number;
  entrySuccess?: number;
  clutchesWon?: number;
}

// Enhanced Strategy Stats
export interface StrategyStats {
  utilityUsage: number;
  positioningScore: number;
  strategyAdherence: number;
  impactRating: number;
  successRate?: number;
  adaptabilityScore?: number;
  teamCoordination?: number;
}

// Weapon and Equipment Interfaces
export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  cost: number;
  damage: number;
  accuracy: number;
  fireRate: number;
}

export interface Utility {
  id: string;
  type: UtilityType;
  cost: number;
  effect: {
    duration: number;
    radius: number;
    damage?: number;
  };
}

// Enhanced Agent Interface
export interface Agent {
  id: string;
  name: string;
  role: string;
  team: Team;
  position: Position;
  isAlive: boolean;
  health: number;
  armor: number;
  weapons: Weapon[];
  equipment: Utility[];
  stats: AgentStats;
  matchStats: MatchStats;
  strategyStats: StrategyStats;
  economy: {
    current: number;
    loadoutValue: number;
    savingThreshold?: number;
  };
  status: {
    isFlashed?: boolean;
    isScoped?: boolean;
    isReloading?: boolean;
    lastKnownPosition?: Position;
  };
}

// Enhanced Team Strategy Stats
export interface TeamStrategyStats {
  roundsWonWithStrategy: { [key: string]: number };
  strategySuccessRate: number;
  lastSuccessfulStrategy: string;
  preferredStrategies?: string[];
  adaptabilityScore?: number;
  economyManagement?: number;
}

// Enhanced Team Interface
export interface Team {
  money: number;
  roundWins: number;
  lossBonus: number;
  timeoutAvailable: boolean;
  strategy: string;
  agents: Agent[];
  strategyStats: TeamStrategyStats;
  economy: {
    totalValue: number;
    averageValue: number;
    buyType: 'full' | 'eco' | 'force' | 'semi';
  };
  performance: {
    winStreak: number;
    roundDominance: number;
    utilityEfficiency: number;
  };
}

// Strategy Interfaces
export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  team: Team;
  description: string;
  requirements: {
    minPlayers: number;
    minMoney: number;
    equipment: string[];
    positions: Position[];
  };
  phases: {
    setup: string[];
    execution: string[];
    fallback: string[];
  };
}

// Enhanced Match State
export interface MatchState {
  id: string;
  status: MatchStatus;
  currentRound: number;
  maxRounds: number;
  score: { t: number; ct: number };
  winner: Team | null;
  startTime: number | null;
  endTime: number | null;
  map: {
    name: string;
    areas: MapArea[];
    callouts: { [key: string]: Position };
  };
}

// Enhanced Round State
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
  momentum: {
    team: Team | null;
    factor: number;
  };
}

// Enhanced Game State
export interface GameState {
  match: MatchState;
  round: RoundState;
  teams: {
    t: Team;
    ct: Team;
  };
  events: GameEvent[];
  combatResult: CombatResult | null;
  meta: {
    version: string;
    timestamp: number;
    tickRate: number;
  };
}

// Enhanced Game Event
export interface GameEvent {
  type: GameEventType;
  data: any;
  timestamp: number;
  round: number;
  location?: Position;
  impact?: number;
}

// Enhanced Game Config
export interface GameConfig {
  maxRounds: number;
  startingSide: Team;
  initialStrategy: string;
  difficulty: GameDifficulty;
  matchId: string;
  serverSettings?: {
    tickRate: number;
    updateRate: number;
    maxPlayers: number;
  };
  rules?: {
    friendlyFire: boolean;
    roundTime: number;
    freezeTime: number;
    bombTimer: number;
  };
}

// Enhanced Loadout Config
export interface LoadoutConfig {
  weapons: Weapon[];
  equipment: Utility[];
  total: number;
  restrictions?: {
    maxPrimary: number;
    maxUtility: number;
  };
}

// Enhanced Combat Result
export interface CombatResult {
  type: 'kill' | 'damage' | 'utility';
  killerId?: string;
  victimId?: string;
  weapon?: Weapon;
  damage?: number;
  timestamp: number;
  position?: Position;
  isWallbang?: boolean;
  isHeadshot?: boolean;
  throughSmoke?: boolean;
}

// System Error Interface
export interface SystemError {
  code: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  context?: any;
}

// Game System State
export interface GameSystemState {
  isInitialized: boolean;
  hasError: boolean;
  lastError: SystemError | null;
  performance: {
    fps: number;
    ping: number;
    tickRate: number;
  };
}