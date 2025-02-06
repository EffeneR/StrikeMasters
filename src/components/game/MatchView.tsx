'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  XCircle
} from 'lucide-react';
import BuyMenu from './BuyMenu';
import GameRenderer from './GameRenderer';
import CombatVisualizer from './CombatVisualizer';
import { useGame } from '@/components/game-provider';
import { toast } from 'sonner';

// Types and Interfaces
interface Agent {
  id: string;
  name: string;
  role: string;
  team: 't' | 'ct';
  health: number;
  isAlive: boolean;
  weapons: string[];
  matchStats: {
    kills: number;
    deaths: number;
  };
  strategyStats?: {
    utilityUsage: number;
    positioningScore: number;
    strategyAdherence: number;
    impactRating: number;
  };
}

interface Team {
  money: number;
  agents: Agent[];
  strategy: string;
  strategyStats?: {
    roundsWonWithStrategy: { [key: string]: number };
    strategySuccessRate: number;
    lastSuccessfulStrategy: string;
  };
}

interface GameState {
  match: {
    score: { t: number; ct: number };
    currentRound: number;
    status: 'active' | 'paused' | 'ended';
  };
  round: {
    phase: 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
    timeLeft: number;
    currentStrategy: {
      t: string;
      ct: string;
    };
    activeCall: string | null;
  };
  teams: {
    t: Team;
    ct: Team;
  };
  events: any[];
  combatResult: any;
}

// Constants
const T_STRATEGIES = {
  default: "Default Setup",
  rush_b: "Rush B",
  split_a: "Split A",
  mid_control: "Mid Control",
  fake_a_b: "Fake A to B",
  eco_rush: "Eco Rush"
} as const;

const CT_STRATEGIES = {
  default: "Default Setup",
  aggressive_mid: "Aggressive Mid",
  stack_a: "Stack A",
  stack_b: "Stack B",
  retake_setup: "Retake Setup",
  full_save: "Full Save"
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
  split: "Split Attack"
} as const;

const STRATEGY_DESCRIPTIONS = {
  default: "Balanced setup with standard positions",
  rush_b: "Fast B execute with full team commitment",
  split_a: "Split attack through Long and Short A",
  mid_control: "Secure mid control before site hit",
  fake_a_b: "Fake presence at A before B execute",
  eco_rush: "Economic round with rushed strategy"
} as const;

// Utility Components
const TeamScore: React.FC<{
  score?: { t?: number; ct?: number };
  round?: number;
}> = ({ score, round }) => {
  const defaultScore = { t: 0, ct: 0 };
  const safeScore = score ?? defaultScore;
  const safeRound = round ?? 1;

  return (
    <Card className="bg-gray-800 p-4">
      <div className="text-center">
        <div className="text-3xl font-bold">
          <span className="text-yellow-400">T {safeScore.t}</span>
          {' : '}
          <span className="text-blue-400">{safeScore.ct} CT</span>
        </div>
        <div className="text-xl text-gray-400">Round {safeRound}</div>
      </div>
    </Card>
  );
};

const StrategyPerformance: React.FC<{
  strategy: string;
  successRate: number;
  roundsWon: number;
}> = ({ strategy, successRate, roundsWon }) => (
  <div className="bg-gray-800 rounded p-2 mt-2">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-300">
        {T_STRATEGIES[strategy as keyof typeof T_STRATEGIES] || strategy}
      </span>
      <span className="text-sm text-green-400">{roundsWon} wins</span>
    </div>
    <Progress value={successRate * 100} className="h-1" />
  </div>
);

const StrategyPanel: React.FC<{
  side: 't' | 'ct';
  phase: string;
  currentStrategy: string;
  currentCall: string | null;
  strategyStats: any;
  onStrategyChange: (strategy: string) => void;
  onMidRoundCall: (call: string) => void;
}> = ({
  side,
  phase,
  currentStrategy,
  currentCall,
  strategyStats,
  onStrategyChange,
  onMidRoundCall
}) => {
  const strategies = side === 't' ? T_STRATEGIES : CT_STRATEGIES;
  
  const handleStrategyChange = useCallback((newStrategy: string) => {
    try {
      onStrategyChange(newStrategy);
      toast.success(`Strategy changed to ${strategies[newStrategy as keyof typeof strategies]}`);
    } catch (error) {
      toast.error('Failed to change strategy');
      console.error('Strategy change error:', error);
    }
  }, [onStrategyChange, strategies]);

  const handleMidRoundCall = useCallback((call: string) => {
    try {
      onMidRoundCall(call);
      toast.success(`New call: ${MID_ROUND_CALLS[call as keyof typeof MID_ROUND_CALLS]}`);
    } catch (error) {
      toast.error('Failed to make mid-round call');
      console.error('Mid-round call error:', error);
    }
  }, [onMidRoundCall]);

  return (
    <Card className="bg-gray-800 p-4 mb-4">
      <div className="space-y-4">
        {phase === 'freezetime' && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Pre-Round Strategy</h3>
              <TrendingUp
                className={`w-5 h-5 ${
                  strategyStats?.strategySuccessRate > 0.6
                    ? 'text-green-400'
                    : 'text-yellow-400'
                }`}
              />
            </div>
            
            <Select 
              value={currentStrategy} 
              onValueChange={handleStrategyChange}
            >
              <SelectTrigger className="w-full bg-gray-700">
                <SelectValue placeholder="Select Strategy" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(strategies).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div>{label}</div>
                      <div className="text-xs text-gray-400">
                        {STRATEGY_DESCRIPTIONS[key as keyof typeof STRATEGY_DESCRIPTIONS]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {strategyStats?.roundsWonWithStrategy && (
              <StrategyPerformance
                strategy={currentStrategy}
                successRate={strategyStats.strategySuccessRate ?? 0}
                roundsWon={strategyStats.roundsWonWithStrategy[currentStrategy] ?? 0}
              />
            )}
          </>
        )}

        {phase === 'live' && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Mid-Round Control</h3>
              {currentCall && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">Active Call</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MID_ROUND_CALLS).map(([key, label]) => (
                <Button
                  key={key}
                  onClick={() => handleMidRoundCall(key)}
                  className={`${
                    currentCall === key
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  size="sm"
                >
                  {label}
                </Button>
              ))}
            </div>
          </>
        )}

        <div className="mt-2 text-sm text-gray-400">
          Active Strategy: {strategies[currentStrategy as keyof typeof strategies] ?? 'Default'}
          {currentCall && (
            <div className="mt-1 text-yellow-400">
              Current Call: {MID_ROUND_CALLS[currentCall as keyof typeof MID_ROUND_CALLS] ?? 'None'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const AgentPerformanceCard: React.FC<{
  agent: Agent;
}> = ({ agent }) => {
  const getHealthColor = (health: number) => {
    if (health > 70) return 'bg-green-500';
    if (health > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'utility': return <Shield className="w-4 h-4" />;
      case 'positioning': return <Target className="w-4 h-4" />;
      case 'strategy': return <BrainCircuit className="w-4 h-4" />;
      case 'impact': return <Zap className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className={`p-3 ${!agent.isAlive ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="font-bold">{agent.name}</h4>
          <span className="text-sm text-gray-400">{agent.role}</span>
        </div>
        <div className="flex items-center gap-2">
          {agent.isAlive ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Progress 
            value={agent.health} 
            className={`h-2 ${getHealthColor(agent.health)}`}
          />
          <span className="text-sm">{agent.health}HP</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm">K: {agent.matchStats.kills}</div>
          <div className="text-sm">D: {agent.matchStats.deaths}</div>
        </div>

        {agent.strategyStats && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(agent.strategyStats).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                {getStatIcon(key)}
                <Progress value={value * 100} className="h-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const TeamSection: React.FC<{
  side: 't' | 'ct';
  team: Team;
}> = ({ side, team }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">
          {side === 't' ? 'Terrorists' : 'Counter-Terrorists'}
        </h3>
        <div className="text-lg">
          ${team.money.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.agents.map((agent) => (
          <AgentPerformanceCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
};

const MatchView: React.FC = () => {
  const { gameState, updateStrategy, makeMidRoundCall } = useGame();
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (gameState) {
      setIsLoading(false);
    }
  }, [gameState]);

  useEffect(() => {
    if (!gameState || !gameState.round) {
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

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-gray-800 p-4">
          <div className="text-center text-white">
            Loading game state...
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (!gameState || !gameState.round || !gameState.match || !gameState.teams) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-gray-800 p-4">
          <div className="text-center text-red-500">
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
    <div className="container mx-auto p-4 space-y-6">
      <TeamScore 
        score={gameState.match.score} 
        round={gameState.match.currentRound} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <StrategyPanel
            side="t"
            phase={gameState.round.phase}
            currentStrategy={gameState.round.currentStrategy.t}
            currentCall={gameState.round.activeCall}
            strategyStats={gameState.teams.t.strategyStats}
            onStrategyChange={(strategy) => {
              try {
                updateStrategy('t', strategy);
              } catch (error) {
                console.error('Error updating T strategy:', error);
                toast.error('Failed to update T strategy');
              }
            }}
            onMidRoundCall={(call) => {
              try {
                makeMidRoundCall('t', call);
              } catch (error) {
                console.error('Error making T mid-round call:', error);
                toast.error('Failed to make mid-round call');
              }
            }}
          />
          <TeamSection side="t" team={gameState.teams.t} />
        </div>

        <div>
          <StrategyPanel
            side="ct"
            phase={gameState.round.phase}
            currentStrategy={gameState.round.currentStrategy.ct}
            currentCall={gameState.round.activeCall}
            strategyStats={gameState.teams.ct.strategyStats}
            onStrategyChange={(strategy) => {
              try {
                updateStrategy('ct', strategy);
              } catch (error) {
                console.error('Error updating CT strategy:', error);
                toast.error('Failed to update CT strategy');
              }
            }}
            onMidRoundCall={(call) => {
              try {
                makeMidRoundCall('ct', call);
              } catch (error) {
                console.error('Error making CT mid-round call:', error);
                toast.error('Failed to make mid-round call');
              }
            }}
          />
          <TeamSection side="ct" team={gameState.teams.ct} />
        </div>
      </div>

      {showBuyMenu && <BuyMenu />}
      
      {gameState && <GameRenderer gameState={gameState} />}
      
      {gameState.combatResult && (
        <CombatVisualizer result={gameState.combatResult} />
      )}
    </div>
  );
};

export default MatchView;