'use client';

import React, { useState, useEffect } from 'react';
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
    currentStrategy?: {
      t: string;
      ct: string;
    };
    activeCall?: string | null;
  };
  teams: {
    t: Team;
    ct: Team;
  };
  events: any[];
  combatResult: any;
}

const MatchView: React.FC = () => {
  const { state, controller } = useGame();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showBuyMenu, setShowBuyMenu] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<string>('default');
  const [currentCall, setCurrentCall] = useState<string | null>(null);

  useEffect(() => {
    if (state?.round?.phase === 'freezetime') {
      setShowBuyMenu(true);
    } else {
      setShowBuyMenu(false);
      setSelectedAgent(null);
    }
  }, [state?.round?.phase]);

  const handleStrategyChange = (strategy: string) => {
    setCurrentStrategy(strategy);
    controller.updateStrategy('t', strategy);
  };

  const handleMidRoundCall = (call: string) => {
    setCurrentCall(call);
    controller.processMidRoundCall('t', call);
  };

  const handleBuy = (itemId: string) => {
    if (selectedAgent) {
      controller.buyItem(selectedAgent.id, itemId);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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

// Strategy Performance Indicator Component
const StrategyPerformance = ({ 
  strategy, 
  successRate, 
  roundsWon 
}: { 
  strategy: string; 
  successRate: number;
  roundsWon: number;
}) => (
  <div className="bg-gray-800 rounded p-2 mt-2">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm text-gray-300">{T_STRATEGIES[strategy]}</span>
      <span className="text-sm text-green-400">{roundsWon} wins</span>
    </div>
    <Progress value={successRate * 100} className="h-1" />
  </div>
);

// Strategy Control Panel Component
const StrategyPanel = ({
  side,
  phase,
  currentStrategy,
  currentCall,
  strategyStats,
  onStrategyChange,
  onMidRoundCall
}: {
  side: 't' | 'ct';
  phase: string;
  currentStrategy: string;
  currentCall: string | null;
  strategyStats: any;
  onStrategyChange: (strategy: string) => void;
  onMidRoundCall: (call: string) => void;
}) => (
  <Card className="bg-gray-800 p-4 mb-4">
    <div className="space-y-4">
      {phase === 'freezetime' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Pre-Round Strategy</h3>
            <TrendingUp className={`w-5 h-5 ${
              strategyStats?.strategySuccessRate > 0.6 ? 'text-green-400' : 'text-yellow-400'
            }`} />
          </div>
          
          <Select
            value={currentStrategy}
            onValueChange={onStrategyChange}
          >
            <SelectTrigger className="w-full bg-gray-700">
              <SelectValue placeholder="Select Strategy" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(T_STRATEGIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div>
                    <div>{label}</div>
                    <div className="text-xs text-gray-400">{STRATEGY_DESCRIPTIONS[key]}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {strategyStats?.roundsWonWithStrategy && (
            <StrategyPerformance
              strategy={currentStrategy}
              successRate={strategyStats.strategySuccessRate}
              roundsWon={strategyStats.roundsWonWithStrategy[currentStrategy] || 0}
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
                onClick={() => onMidRoundCall(key)}
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
        Active Strategy: {T_STRATEGIES[currentStrategy]}
        {currentCall && (
          <div className="mt-1 text-yellow-400">
            Current Call: {MID_ROUND_CALLS[currentCall]}
          </div>
        )}
      </div>
    </div>
  </Card>
);

// Agent Performance Card Component
const AgentPerformanceCard = ({ agent }: { agent: Agent }) => {
  const getPerformanceColor = (value: number) => {
    if (value >= 0.7) return 'text-green-400';
    if (value >= 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="mt-2 space-y-1">
      {agent.strategyStats && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span>Strategy Adherence</span>
            <span className={getPerformanceColor(agent.strategyStats.strategyAdherence)}>
              {Math.round(agent.strategyStats.strategyAdherence * 100)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Utility Usage</span>
            <span className={getPerformanceColor(agent.strategyStats.utilityUsage)}>
              {Math.round(agent.strategyStats.utilityUsage * 100)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Impact Rating</span>
            <span className={getPerformanceColor(agent.strategyStats.impactRating)}>
              {agent.strategyStats.impactRating.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// Enhanced TeamSection component
const TeamSection = ({ side, team }: { side: 't' | 'ct', team: Team }) => (
  <div className="space-y-2">
    <h2 className={`text-xl font-bold ${side === 't' ? 'text-yellow-400' : 'text-blue-400'}`}>
      {side === 't' ? 'Terrorists' : 'Counter-Terrorists'}
    </h2>

    {side === 't' && (
      <StrategyPanel
        side={side}
        phase={state.round.phase}
        currentStrategy={currentStrategy}
        currentCall={currentCall}
        strategyStats={team.strategyStats}
        onStrategyChange={handleStrategyChange}
        onMidRoundCall={handleMidRoundCall}
      />
    )}

    {team.agents.map(agent => (
      <Card 
        key={agent.id} 
        className={`bg-gray-800 transition-all
          ${!agent.isAlive ? 'opacity-50' : ''}
          ${showBuyMenu && agent.isAlive && side === 't' ? 'cursor-pointer hover:bg-gray-700' : ''}`}
        onClick={() => {
          if (showBuyMenu && agent.isAlive && side === 't') {
            setSelectedAgent(agent);
          }
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold flex items-center gap-2">
                {agent.name}
                {agent.strategyStats?.strategyAdherence > 0.7 && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-sm text-gray-400">{agent.role}</div>
            </div>
            <div className="text-right">
              <div className="text-green-400">HP: {agent.health}</div>
              <div className="text-sm text-gray-400">${team.money}</div>
            </div>
          </div>
          
          <div className="mt-2 text-sm">
            {agent.weapons?.join(', ') || 'No weapons'}
          </div>
          
          <div className="mt-1 text-sm flex justify-between">
            <span>K: {agent.matchStats?.kills || 0} / D: {agent.matchStats?.deaths || 0}</span>
            {agent.strategyStats && (
              <span className="text-xs text-gray-400">
                Impact: {agent.strategyStats.impactRating.toFixed(2)}
              </span>
            )}
          </div>

          <AgentPerformanceCard agent={agent} />
        </div>
      </Card>
    ))}

    {side === 't' && team.strategyStats && (
      <Card className="bg-gray-700 p-2 mt-4">
        <div className="text-sm">
          <div className="flex justify-between mb-1">
            <span>Strategy Success Rate:</span>
            <span className={`font-bold ${
              team.strategyStats.strategySuccessRate > 0.6 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {Math.round(team.strategyStats.strategySuccessRate * 100)}%
            </span>
          </div>
          <Progress 
            value={team.strategyStats.strategySuccessRate * 100} 
            className="h-1"
          />
        </div>
      </Card>
    )}
  </div>
);

// Your existing main component logic with updated render
return (
  <div className="min-h-screen bg-gray-900 text-white p-4">
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="bg-gray-800 p-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            <span className="text-yellow-400">T {state.match.score.t}</span>
            {' : '}
            <span className="text-blue-400">{state.match.score.ct} CT</span>
          </div>
          <div className="text-xl text-gray-400">Round {state.match.currentRound}</div>
          <div className="text-2xl font-mono">{formatTime(state.round.timeLeft)}</div>
          <div className="text-lg text-yellow-400">{state.round.phase.toUpperCase()}</div>
          {state.round.phase === 'freezetime' && (
            <div className="text-sm text-gray-400 mt-1">
              Select strategy and prepare for the round
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TeamSection 
          side="t" 
          team={state.teams.t}
          phase={state.round.phase}
          currentStrategy={currentStrategy}
          currentCall={currentCall}
          onStrategyChange={handleStrategyChange}
          onMidRoundCall={handleMidRoundCall}
          showBuyMenu={showBuyMenu}
          setSelectedAgent={setSelectedAgent}
        />
        
        <div className="lg:row-span-2">
          <GameRenderer
            agents={[...state.teams.t.agents, ...state.teams.ct.agents]}
            events={state.events}
            phase={state.round.phase}
            strategy={currentStrategy}
            currentCall={currentCall}
          />
          {state.combatResult && (
            <CombatVisualizer
              combatResult={state.combatResult}
              onAnimationComplete={() => controller.clearCombatResult()}
            />
          )}
        </div>

        <TeamSection 
          side="ct" 
          team={state.teams.ct}
          phase={state.round.phase}
          currentStrategy={state.round.currentStrategy?.ct || 'default'}
          currentCall={null}
          showBuyMenu={false}
        />
      </div>

      {showBuyMenu && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative" onClick={e => e.stopPropagation()}>
            <BuyMenu
              agent={selectedAgent}
              money={state.teams[selectedAgent.team].money}
              side={selectedAgent.team}
              onBuy={handleBuy}
              strategy={currentStrategy}
            />
            <Button 
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 p-0"
              onClick={() => setSelectedAgent(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Button 
          onClick={() => {
            if (state.match.status === 'paused') {
              controller.resumeMatch();
            } else {
              controller.pauseMatch();
            }
          }}
          className={state.match.status === 'paused' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
        >
          {state.match.status === 'paused' ? 'Resume' : 'Pause'}
        </Button>
        <Button 
          className="bg-red-600 hover:bg-red-700" 
          onClick={() => controller.endMatch()}
        >
          End Match
        </Button>
      </div>
    </div>
  </div>
);
};

export default MatchView;