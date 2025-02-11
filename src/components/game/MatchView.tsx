'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Shield,
  Zap,
  BrainCircuit,
  Move,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Swords,
  Timer,
  Users,
  Brain,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import BuyMenu from './BuyMenu';
import GameRenderer from './GameRenderer';
import CombatVisualizer from './CombatVisualizer';
import { useGame } from '@/components/game-provider';

// Types and Interfaces
type TeamSide = 't' | 'ct';
type GamePhase = 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
type GameStatus = 'active' | 'paused' | 'ended';
type StrategyKey = keyof typeof T_STRATEGIES | keyof typeof CT_STRATEGIES;
type MidRoundCallKey = keyof typeof MID_ROUND_CALLS;

interface AgentStats {
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  utilityDamage: number;
}

interface StrategyMetrics {
  utilityUsage: number;
  positioningScore: number;
  strategyAdherence: number;
  impactRating: number;
  success: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  team: TeamSide;
  health: number;
  armor: number;
  money: number;
  isAlive: boolean;
  weapons: string[];
  utility: string[];
  position: {
    x: number;
    y: number;
  };
  matchStats: AgentStats;
  strategyStats: StrategyMetrics;
}

interface TeamStrategyStats {
  roundsWonWithStrategy: Record<string, number>;
  strategySuccessRate: number;
  lastSuccessfulStrategy: string;
  averageExecutionTime: number;
  preferredSites: Record<string, number>;
}

interface Team {
  money: number;
  agents: Agent[];
  strategy: string;
  equipment: Record<string, number>;
  strategyStats: TeamStrategyStats;
  performance: {
    roundWinRate: number;
    plantRate: number;
    retakeSuccess: number;
  };
}

interface RoundState {
  phase: GamePhase;
  timeLeft: number;
  currentStrategy: Record<TeamSide, string>;
  activeCall: string | null;
  bombPlanted: boolean;
  bombSite?: 'A' | 'B';
  plantTime?: number;
}

interface GameState {
  match: {
    score: Record<TeamSide, number>;
    currentRound: number;
    status: GameStatus;
    startTime: number;
    map: string;
  };
  round: RoundState;
  teams: Record<TeamSide, Team>;
  events: GameEvent[];
  combatResult: CombatResult | null;
}

interface GameEvent {
  type: string;
  timestamp: number;
  data: any;
}

interface CombatResult {
  winner: TeamSide;
  kills: Array<{
    killer: string;
    victim: string;
    weapon: string;
    headshot: boolean;
  }>;
  damage: Record<string, number>;
}

// Constants
const T_STRATEGIES = {
  default: "Default Setup",
  rush_b: "Rush B",
  split_a: "Split A",
  mid_control: "Mid Control",
  fake_a_b: "Fake A to B",
  eco_rush: "Eco Rush",
  double_fake: "Double Fake",
  slow_default: "Slow Default",
  contact_play: "Contact Play",
  fast_cat: "Fast Cat Control"
} as const;

const CT_STRATEGIES = {
  default: "Default Setup",
  aggressive_mid: "Aggressive Mid",
  stack_a: "Stack A",
  stack_b: "Stack B",
  retake_setup: "Retake Setup",
  full_save: "Full Save",
  double_mid: "Double Mid",
  heavy_a: "Heavy A Defense",
  spread_setup: "Spread Setup",
  aggressive_info: "Aggressive Info"
} as const;

const MID_ROUND_CALLS = {
  rotate_a: "Rotate to A",
  rotate_b: "Rotate to B",
  fall_back: "Fall Back",
  push: "Push",
  hold_positions: "Hold Positions",
  execute_a: "Execute A",
  execute_b: "Execute B",
  fake_a: "Fake A",
  fake_b: "Fake B",
  split: "Split Attack",
  regroup: "Regroup",
  rush: "Rush",
  play_picks: "Play for Picks",
  save: "Save Round"
} as const;

const STRATEGY_DESCRIPTIONS = {
  default: "Balanced setup with standard positions",
  rush_b: "Fast B execute with full team commitment",
  split_a: "Split attack through multiple entry points",
  mid_control: "Secure mid control before site hit",
  fake_a_b: "Fake presence at A before B execute",
  eco_rush: "Economic round with rushed strategy",
  aggressive_mid: "Control mid with aggressive positioning",
  stack_a: "Heavy A site defense",
  stack_b: "Heavy B site defense",
  retake_setup: "Setup for retake scenarios",
  full_save: "Full economic save round",
  double_fake: "Multiple fake executes before real hit",
  slow_default: "Slow methodical default setup",
  contact_play: "Contact-based execute without utility",
  fast_cat: "Quick catwalk control",
  double_mid: "Double mid control setup",
  heavy_a: "Strong A site defense",
  spread_setup: "Spread out defensive setup",
  aggressive_info: "Play for early information"
} as const;

// Error Boundary Component
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Game Error:', error);
      setHasError(true);
      setErrorDetails(error.message);
      toast.error('An error occurred in the game');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <Card className="p-4 bg-red-900/50">
        <div className="text-center text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h3 className="font-bold">Game Error</h3>
          <p className="text-sm text-red-300 mt-2">{errorDetails}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Restart Game
          </Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
};

// Utility Components
const TeamScore = React.memo<{
  score?: Record<TeamSide, number>;
  round?: number;
  status?: GameStatus;
}>(({ score = { t: 0, ct: 0 }, round = 1, status = 'active' }) => (
  <Card className="bg-gray-800 p-4">
    <div className="text-center">
      <div className="text-3xl font-bold">
        <span className="text-yellow-400">T {score.t}</span>
        {' : '}
        <span className="text-blue-400">{score.ct} CT</span>
      </div>
      <div className="text-xl text-gray-400">Round {round}</div>
      {status !== 'active' && (
        <div className="text-sm text-gray-500 mt-1">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      )}
    </div>
  </Card>
));

TeamScore.displayName = 'TeamScore';

const StrategyPerformance = React.memo<{
  strategy: string;
  successRate: number;
  roundsWon: number;
  averageExecutionTime?: number;
}>(({ strategy, successRate, roundsWon, averageExecutionTime }) => (
  <div className="bg-gray-800 rounded p-2 mt-2">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-300">
        {T_STRATEGIES[strategy as keyof typeof T_STRATEGIES] || 
         CT_STRATEGIES[strategy as keyof typeof CT_STRATEGIES] || 
         strategy}
      </span>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-green-400">{roundsWon} wins</span>
        {averageExecutionTime && (
          <span className="text-xs text-gray-400">
            ({averageExecutionTime.toFixed(1)}s)
          </span>
        )}
      </div>
    </div>
    <Progress 
      value={successRate * 100} 
      className="h-1"
      indicatorClassName={cn(
        successRate > 0.7 ? "bg-green-500" :
        successRate > 0.4 ? "bg-yellow-500" :
        "bg-red-500"
      )}
    />
  </div>
))

StrategyPerformance.displayName = 'StrategyPerformance';


const StrategyPanel: React.FC<{
  side: TeamSide;
  phase: GamePhase;
  currentStrategy: string;
  currentCall: string | null;
  strategyStats: TeamStrategyStats;
  onStrategyChange: (strategy: string) => void;
  onMidRoundCall: (call: string) => void;
  disabled?: boolean;
}> = ({
  side,
  phase,
  currentStrategy,
  currentCall,
  strategyStats,
  onStrategyChange,
  onMidRoundCall,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const strategies = side === 't' ? T_STRATEGIES : CT_STRATEGIES;
  
  const handleStrategyChange = useCallback(async (newStrategy: string) => {
    if (disabled || phase !== 'freezetime') return;
    
    setIsLoading(true);
    try {
      await onStrategyChange(newStrategy);
      toast.success(`Strategy changed to ${strategies[newStrategy as StrategyKey]}`);
    } catch (error) {
      toast.error('Failed to change strategy');
      console.error('Strategy change error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onStrategyChange, strategies, disabled, phase]);

  const handleMidRoundCall = useCallback(async (call: string) => {
    if (disabled || phase !== 'live') return;
    
    setIsLoading(true);
    try {
      await onMidRoundCall(call);
      toast.success(`New call: ${MID_ROUND_CALLS[call as MidRoundCallKey]}`);
    } catch (error) {
      toast.error('Failed to make mid-round call');
      console.error('Mid-round call error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onMidRoundCall, disabled, phase]);

  return (
    <Card className={cn(
      "bg-gray-800 p-4 mb-4",
      (isLoading || disabled) && "opacity-50",
      disabled && "cursor-not-allowed"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {side.toUpperCase()} Strategy
        </h3>
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">
            {phase === 'freezetime' ? 'Planning Phase' : 'Execution Phase'}
          </span>
        </div>
      </div>

      {phase === 'freezetime' && (
        <Select
          value={currentStrategy}
          onValueChange={handleStrategyChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select strategy..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(strategies).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {phase === 'live' && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MID_ROUND_CALLS).map(([key, value]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => handleMidRoundCall(key)}
              disabled={disabled || currentCall === key}
              className={cn(
                "text-sm",
                currentCall === key && "bg-blue-900/50"
              )}
            >
              {value}
            </Button>
          ))}
        </div>
      )}

      {strategyStats && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Strategy Performance
          </h4>
          {Object.entries(strategyStats.roundsWonWithStrategy)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([strat, wins]) => (
              <StrategyPerformance
                key={strat}
                strategy={strat}
                successRate={wins / (strategyStats.roundsWonWithStrategy[strat] || 1)}
                roundsWon={wins}
                averageExecutionTime={strategyStats.averageExecutionTime}
              />
            ))}
        </div>
      )}
    </Card>
  );
};

// Main Component
const MatchView = React.memo(() => {
  const { gameState, updateStrategy, makeMidRoundCall } = useGame();
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isValidGameState = (state: any): state is GameState => {
    return state && 
           state.round && 
           state.match && 
           state.teams &&
           typeof state.round.phase === 'string';
  };

  useEffect(() => {
    if (gameState) {
      setIsLoading(false);
    }

    return () => {
      if (gameState?.match?.status === 'active') {
        gameState.controller?.stopGameLoop?.();
        gameState.controller?.unsubscribeAll?.();
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (!isValidGameState(gameState)) {
      console.warn('Game state not properly initialized');
      return;
    }

    try {
      if (gameState.round.phase === 'freezetime') {
        setShowBuyMenu(true);
      } else {
        setShowBuyMenu(false);
      }
    } catch (error) {
      console.error('Error handling game phase:', error);
      toast.error('Error updating game state');
    }
  }, [gameState?.round?.phase]);

  const handleStrategyChange = useCallback(async (team: TeamSide, strategy: string) => {
    try {
      await updateStrategy(team, strategy);
    } catch (error) {
      console.error('Strategy update error:', error);
      toast.error('Failed to update strategy');
    }
  }, [updateStrategy]);

  const handleMidRoundCall = useCallback(async (call: string) => {
    try {
      await makeMidRoundCall(call);
    } catch (error) {
      console.error('Mid-round call error:', error);
      toast.error('Failed to make mid-round call');
    }
  }, [makeMidRoundCall]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-gray-800 p-4">
          <div className="text-center text-white">
            <RefreshCcw className="w-8 h-8 mx-auto animate-spin mb-2" />
            Loading game state...
          </div>
        </Card>
      </div>
    );
  }

  if (!isValidGameState(gameState)) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-gray-800 p-4">
          <div className="text-center text-red-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            Error: Game state not properly initialized
          </div>
          <div className="text-center text-gray-400 mt-2">
            Please try refreshing the page
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4 space-y-6">
        <TeamScore
          score={gameState.match.score}
          round={gameState.match.currentRound}
          status={gameState.match.status}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrategyPanel
            side="t"
            phase={gameState.round.phase}
            currentStrategy={gameState.round.currentStrategy.t}
            currentCall={gameState.round.activeCall}
            strategyStats={gameState.teams.t.strategyStats}
            onStrategyChange={(strategy) => handleStrategyChange('t', strategy)}
            onMidRoundCall={handleMidRoundCall}
            disabled={gameState.match.status !== 'active'}
          />

          <StrategyPanel
            side="ct"
            phase={gameState.round.phase}
            currentStrategy={gameState.round.currentStrategy.ct}
            currentCall={gameState.round.activeCall}
            strategyStats={gameState.teams.ct.strategyStats}
            onStrategyChange={(strategy) => handleStrategyChange('ct', strategy)}
            onMidRoundCall={handleMidRoundCall}
            disabled={gameState.match.status !== 'active'}
          />
        </div>

        {showBuyMenu && (
          <BuyMenu
            team={gameState.teams.t}
            onClose={() => setShowBuyMenu(false)}
          />
        )}

        <GameRenderer
          gameState={gameState}
          className="w-full h-[400px] bg-gray-900 rounded-lg"
        />

        {gameState.combatResult && (
          <CombatVisualizer
            result={gameState.combatResult}
            onClose={() => {
              try {
                gameState.controller?.clearCombatResult();
              } catch (error) {
                console.error('Error clearing combat result:', error);
              }
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
});

MatchView.displayName = 'MatchView';

const MatchViewWrapper = React.memo(() => {
  return (
    <ErrorBoundary>
      <MatchView />
    </ErrorBoundary>
  );
});

MatchViewWrapper.displayName = 'MatchViewWrapper';

export default MatchViewWrapper;