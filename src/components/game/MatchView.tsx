'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
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
  AlertCircle,
  Brain,
  RefreshCcw,
  Shield,
  Swords,
  Clock,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

import BuyMenu from './BuyMenu';
import GameRenderer from './GameRenderer';
import CombatVisualizer from './CombatVisualizer';
import { useGame } from '@/components/game-provider';

// Types
type TeamSide = 't' | 'ct';
type GamePhase = 'freezetime' | 'live' | 'over';
type GameStatus = 'active' | 'paused' | 'finished';

// Interfaces
interface Agent {
  id: string;
  name: string;
  health: number;
  money: number;
  isAlive: boolean;
  matchStats: {
    kills: number;
    deaths: number;
    assists: number;
  };
}

interface Team {
  money: number;
  agents: Agent[];
  strategyStats: TeamStrategyStats;
}

interface TeamStrategyStats {
  roundsWonWithStrategy: Record<string, number>;
  averageExecutionTime?: number;
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

const STRATEGY_DESCRIPTIONS = {
  default: "Balanced setup with standard positions",
  rush_b: "Fast B execute with full team commitment",
  split_a: "Split attack through multiple entry points",
  mid_control: "Secure mid control before site hit",
  fake_a_b: "Fake pressure A then hit B",
  eco_rush: "Economic rush strategy",
  double_fake: "Multiple fake executes before real hit",
  slow_default: "Slow methodical default setup",
  contact_play: "Contact-based execute",
  fast_cat: "Quick catwalk control",
  aggressive_mid: "Aggressive mid control setup",
  stack_a: "Heavy A site stack",
  stack_b: "Heavy B site stack",
  retake_setup: "Setup for retake scenarios",
  full_save: "Full economic save round",
  double_mid: "Double mid control setup",
  heavy_a: "Strong A site defense",
  spread_setup: "Spread out defensive setup",
  aggressive_info: "Early aggressive info gathering"
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

// Error Boundary Component
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setHasError(true);
      setErrorDetails(error.message);
      console.error('Error caught by boundary:', error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <ErrorState message={errorDetails} />;
  }

  return <>{children}</>;
};

// Loading Component
const LoadingState = () => (
  <div className="container mx-auto p-4">
    <Card className="bg-gray-900 p-4">
      <div className="text-center text-white">
        <RefreshCcw className="w-8 h-8 mx-auto animate-spin mb-2" />
        <p>Loading game state...</p>
      </div>
    </Card>
  </div>
);

// Error Component
const ErrorState = ({ message }: { message: string }) => (
  <div className="container mx-auto p-4">
    <Card className="bg-gray-900 p-4">
      <div className="text-center text-red-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <h3 className="font-bold">Error</h3>
        <p className="text-sm mt-2">{message}</p>
      </div>
    </Card>
  </div>
);

// Round Timer Component
const RoundTimer = React.memo<{
  timeLeft: number;
  phase: GamePhase;
}>(({ timeLeft, phase }) => {
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  return (
    <div className="flex items-center space-x-2">
      <Clock className="w-4 h-4" />
      <span className={cn(
        "font-mono",
        phase === 'freezetime' && "text-yellow-400",
        phase === 'live' && "text-green-400",
        phase === 'over' && "text-red-400"
      )}>
        {formattedTime}
      </span>
    </div>
  );
});

RoundTimer.displayName = 'RoundTimer';

// Strategy Performance Component
const StrategyPerformance = React.memo<{
  strategy: string;
  successRate: number;
  roundsWon: number;
  averageExecutionTime?: number;
}>(({ strategy, successRate, roundsWon, averageExecutionTime }) => (
  <div className="bg-gray-700 rounded p-2 mb-2">
    <div className="flex justify-between items-center">
      <span className="text-sm">{strategy}</span>
      <div className="text-xs text-gray-400">
        <span className="text-green-400">{roundsWon} wins</span>
        {averageExecutionTime && (
          <span className="ml-2">({averageExecutionTime}s avg)</span>
        )}
      </div>
    </div>
    <Progress 
      value={successRate} 
      className="h-1 mt-1"
    />
  </div>
));

StrategyPerformance.displayName = 'StrategyPerformance';

// Team Score Component
const TeamScore = React.memo<{
  score: Record<TeamSide, number>;
  round: number;
  status: GameStatus;
}>(({ score, round, status }) => (
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

// Agent Status Component
const AgentStatus = React.memo<{
  agent: Agent;
  showDetails: boolean;
}>(({ agent, showDetails }) => (
  <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded">
    <div className="flex-shrink-0">
      <div className={cn(
        "w-3 h-3 rounded-full",
        agent.isAlive ? "bg-green-500" : "bg-red-500"
      )} />
    </div>
    <div className="flex-grow">
      <div className="text-sm font-medium">{agent.name}</div>
      {showDetails && (
        <div className="text-xs text-gray-400">
          <span>HP: {agent.health}</span>
          <span className="mx-1">|</span>
          <span>$: {agent.money}</span>
        </div>
      )}
    </div>
    {showDetails && (
      <div className="text-xs">
        <div>K: {agent.matchStats.kills}</div>
        <div>D: {agent.matchStats.deaths}</div>
        <div>A: {agent.matchStats.assists}</div>
      </div>
    )}
  </div>
));

AgentStatus.displayName = 'AgentStatus';

// Team Overview Component
const TeamOverview = React.memo<{
  team: Team;
  side: TeamSide;
}>(({ team, side }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center mb-2">
      <h4 className="text-sm font-medium">
        {side.toUpperCase()} Team
      </h4>
      <span className="text-sm text-gray-400">
        ${team.money}
      </span>
    </div>
    <div className="space-y-1">
      {team.agents.map(agent => (
        <AgentStatus 
          key={agent.id}
          agent={agent}
          showDetails={true}
        />
      ))}
    </div>
  </div>
));

TeamOverview.displayName = 'TeamOverview';

// Strategy Panel Component
const StrategyPanel = React.memo<{
  side: TeamSide;
  phase: GamePhase;
  currentStrategy: string;
  currentCall: string | null;
  strategyStats: TeamStrategyStats;
  onStrategyChange: (strategy: string) => void;
  onMidRoundCall: (call: string) => void;
  disabled: boolean;
}>(({ 
  side, 
  phase, 
  currentStrategy, 
  currentCall, 
  strategyStats, 
  onStrategyChange, 
  onMidRoundCall, 
  disabled 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const strategies = side === 't' ? T_STRATEGIES : CT_STRATEGIES;

  const handleStrategyChange = useCallback(async (newStrategy: string) => {
    if (disabled || phase !== 'freezetime') return;
    
    setIsLoading(true);
    try {
      await onStrategyChange(newStrategy);
      toast.success(`Strategy changed to ${strategies[newStrategy]}`);
    } catch (error) {
      toast.error('Failed to change strategy');
    } finally {
      setIsLoading(false);
    }
  }, [disabled, phase, onStrategyChange, strategies]);

  const handleMidRoundCall = useCallback(async (call: string) => {
    if (disabled || phase !== 'live') return;
    
    setIsLoading(true);
    try {
      await onMidRoundCall(call);
      toast.success(`New call: ${MID_ROUND_CALLS[call]}`);
    } catch (error) {
      toast.error('Failed to make mid-round call');
    } finally {
      setIsLoading(false);
    }
  }, [disabled, phase, onMidRoundCall]);

  return (
    <Card className={cn(
      "bg-gray-800 p-4 mb-4",
      (isLoading || disabled) && "opacity-50"
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
        <>
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
          {currentStrategy && (
            <p className="text-sm text-gray-400 mt-2">
              {STRATEGY_DESCRIPTIONS[currentStrategy]}
            </p>
          )}
        </>
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
                strategy={strategies[strat] || strat}
                successRate={wins * 10}
                roundsWon={wins}
                averageExecutionTime={strategyStats.averageExecutionTime}
              />
            ))}
        </div>
      )}
    </Card>
  );
});

StrategyPanel.displayName = 'StrategyPanel';

// Main Component
const MatchView = () => {
  const { state, controller } = useGame();
  const [isLoading, setIsLoading] = useState(true);
  const [showBuyMenu, setShowBuyMenu] = useState(false);

  const handleStrategyChange = useCallback((side: TeamSide, strategy: string) => {
    try {
      controller?.updateStrategy(side, strategy);
      toast.success(`Strategy updated for ${side.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to update strategy');
    }
  }, [controller]);

  const handleMidRoundCall = useCallback((call: string) => {
    try {
      controller?.makeMidRoundCall(call);
      toast.success(`Mid-round call: ${MID_ROUND_CALLS[call]}`);
    } catch (error) {
      toast.error('Failed to make mid-round call');
    }
  }, [controller]);

  const handleBuyMenuToggle = useCallback(() => {
    setShowBuyMenu(prev => !prev);
  }, []);

  const handleCombatResultClose = useCallback(() => {
    try {
      controller?.clearCombatResult();
    } catch (error) {
      console.error('Error clearing combat result:', error);
      toast.error('Failed to clear combat result');
    }
  }, [controller]);

  useEffect(() => {
    if (state && controller) {
      setIsLoading(false);
    }
  }, [state, controller]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!state?.match || !state?.round || !state?.teams) {
    return <ErrorState message="Invalid match state" />;
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <TeamScore
            score={state.match.score}
            round={state.match.currentRound}
            status={state.match.status}
          />
          <RoundTimer
            timeLeft={state.round.timeLeft}
            phase={state.round.phase}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrategyPanel
            side="t"
            phase={state.round.phase}
            currentStrategy={state.round.currentStrategy.t}
            currentCall={state.round.activeCall}
            strategyStats={state.teams.t.strategyStats}
            onStrategyChange={(strategy) => handleStrategyChange('t', strategy)}
            onMidRoundCall={handleMidRoundCall}
            disabled={state.match.status !== 'active'}
          />

          <StrategyPanel
            side="ct"
            phase={state.round.phase}
            currentStrategy={state.round.currentStrategy.ct}
            currentCall={state.round.activeCall}
            strategyStats={state.teams.ct.strategyStats}
            onStrategyChange={(strategy) => handleStrategyChange('ct', strategy)}
            onMidRoundCall={handleMidRoundCall}
            disabled={state.match.status !== 'active'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TeamOverview team={state.teams.t} side="t" />
          <TeamOverview team={state.teams.ct} side="ct" />
        </div>

        <Button
          onClick={handleBuyMenuToggle}
          className="w-full"
          disabled={state.round.phase !== 'freezetime'}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Toggle Buy Menu
        </Button>

        <Suspense fallback={<LoadingState />}>
          {showBuyMenu && (
            <BuyMenu
              team={state.teams.t}
              onClose={() => setShowBuyMenu(false)}
            />
          )}

          <GameRenderer
            className="w-full h-[400px] bg-gray-900 rounded-lg"
          />

          {state.combatResult && (
            <CombatVisualizer
              result={state.combatResult}
              onClose={handleCombatResultClose}
            />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default MatchView;