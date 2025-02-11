'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, Timer, Trophy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

// Interfaces
interface Agent {
  id: string;
  name: string;
  team: 't' | 'ct';
  role: string;
  isAlive: boolean;
  matchStats: {
    kills: number;
    deaths: number;
    assists: number;
  };
  strategyStats: {
    utilityUsage: number;
    positioningScore: number;
    strategyAdherence: number;
    impactRating: number;
  };
}

interface Team {
  agents: Agent[];
  strategyStats: {
    roundsWonWithStrategy: { [key: string]: number };
    strategySuccessRate: number;
    lastSuccessfulStrategy: string;
  };
}

interface MatchState {
  phase: 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
  round: number;
  score: {
    t: number;
    ct: number;
  };
  timeLeft: number;
  teams: {
    t: Team;
    ct: Team;
  };
  currentStrategy: {
    t: string;
    ct: string;
  };
  activeCall: string | null;
}

interface MatchFlowProps {
  matchState: MatchState;
  onPhaseEnd: () => void;
  onTimeUpdate: () => void;
  onStrategyChange: (team: 't' | 'ct', strategy: string) => void;
  onMidRoundCall: (team: 't' | 'ct', call: string) => void;
}

// Constants
const PHASE_MESSAGES: Record<string, string> = {
  warmup: "Prepare for the round",
  freezetime: "Buy phase - Select your strategy",
  live: "Round in progress",
  planted: "Bomb has been planted!",
  ended: "Round Over"
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  default: "Balanced setup with standard positions",
  rush_b: "Fast B execute with full team commitment",
  split_a: "Split attack through Long and Short A",
  mid_control: "Secure mid control before site hit",
  fake_a_b: "Fake presence at A before B execute",
  eco_rush: "Economic round with rushed strategy",
  defensive_stack: "Stack multiple players on one site",
  retake_setup: "Setup for retake scenarios"
};

const AVAILABLE_STRATEGIES = {
  t: ['default', 'rush_b', 'split_a', 'mid_control', 'fake_a_b', 'eco_rush'],
  ct: ['default', 'defensive_stack', 'retake_setup', 'mid_control']
};

const MID_ROUND_CALLS = {
  t: ['rotate_a', 'rotate_b', 'execute', 'hold', 'split', 'fake'],
  ct: ['rotate_a', 'rotate_b', 'retake', 'hold', 'stack', 'spread']
};

// Components
const PhaseIndicator: React.FC<{ 
  phase: string; 
  timeLeft: number;
  className?: string;
}> = React.memo(({ phase, timeLeft, className }) => (
  <Card className={cn(`
    p-4 mb-4 flex justify-between items-center
    ${phase === 'planted' ? 'bg-red-900/50' : 'bg-gray-800/50'}
    backdrop-blur-sm transition-colors duration-200
  `, className)}>
    <div className="flex items-center gap-2">
      {phase === 'planted' ? (
        <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
      ) : (
        <Timer className="w-5 h-5" />
      )}
      <span className="font-bold">{PHASE_MESSAGES[phase] || 'Unknown Phase'}</span>
    </div>
    <span className="text-xl font-mono">
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
    </span>
  </Card>
));

const TeamScore: React.FC<{ 
  score: { t: number; ct: number }; 
  round: number;
  className?: string;
}> = React.memo(({ score, round, className }) => (
  <Card className={cn("bg-gray-800/50 backdrop-blur-sm p-4 mb-4", className)}>
    <div className="text-center">
      <div className="text-3xl font-bold mb-2">
        <span className="text-yellow-400">{score.t}</span>
        {' : '}
        <span className="text-blue-400">{score.ct}</span>
      </div>
      <div className="text-gray-400">Round {round}</div>
    </div>
  </Card>
));

const StrategyButton: React.FC<{
  strategy: string;
  currentStrategy: string;
  onClick: () => void;
  className?: string;
}> = React.memo(({ strategy, currentStrategy, onClick, className }) => (
  <Button
    size="sm"
    onClick={onClick}
    variant={strategy === currentStrategy ? 'default' : 'outline'}
    className={cn('transition-all duration-200', className)}
  >
    {strategy.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
  </Button>
));

const MidRoundCallButton: React.FC<{
  call: string;
  onClick: () => void;
  className?: string;
}> = React.memo(({ call, onClick, className }) => {
  const getCallStyle = () => {
    switch (call) {
      case 'rotate_a':
      case 'rotate_b':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'execute':
      case 'retake':
        return 'bg-green-600 hover:bg-green-700';
      case 'hold':
      case 'stack':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <Button
      size="sm"
      onClick={onClick}
      className={cn(
        'transition-colors',
        getCallStyle(),
        className
      )}
    >
      {call.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
    </Button>
  );
});

const AgentStatus: React.FC<{
  agent: Agent;
  className?: string;
}> = React.memo(({ agent, className }) => (
  <div className={cn("flex justify-between items-center mb-2", className)}>
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        agent.isAlive ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span className={agent.isAlive ? 'text-white' : 'text-gray-500'}>
        {agent.name}
      </span>
    </div>
    <div className="text-sm text-gray-400">
      {Math.round(agent.strategyStats.strategyAdherence * 100)}% adherence
    </div>
  </div>
));

const StrategyOverview: React.FC<{
  team: Team;
  strategy: string;
  phase: string;
  onStrategyChange?: (strategy: string) => void;
  onMidRoundCall?: (call: string) => void;
  className?: string;
}> = React.memo(({ team, strategy, phase, onStrategyChange, onMidRoundCall, className }) => (
  <Card className={cn("bg-gray-800/50 backdrop-blur-sm p-4", className)}>
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <Swords className="w-5 h-5" />
        <h3 className="font-bold">Strategy Overview</h3>
      </div>
      <span className="text-sm text-gray-400">
        Success Rate: {Math.round((team.strategyStats?.strategySuccessRate || 0) * 100)}%
      </span>
    </div>

    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-400 mb-1">Current Strategy</div>
        <div className="font-medium">{strategy}</div>
        <div className="text-sm text-gray-400 mt-1">
          {STRATEGY_DESCRIPTIONS[strategy] || 'Strategy description not available'}
        </div>
      </div>

      {phase === 'freezetime' && onStrategyChange && (
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_STRATEGIES[team.agents[0]?.team || 't'].map((strat) => (
            <StrategyButton
              key={strat}
              strategy={strat}
              currentStrategy={strategy}
              onClick={() => onStrategyChange(strat)}
            />
          ))}
        </div>
      )}

      {phase === 'live' && onMidRoundCall && (
        <div className="grid grid-cols-2 gap-2">
          {MID_ROUND_CALLS[team.agents[0]?.team || 't'].map((call) => (
            <MidRoundCallButton
              key={call}
              call={call}
              onClick={() => onMidRoundCall(call)}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm text-gray-400 mb-2">Team Performance</div>
        {team.agents.map(agent => (
          <AgentStatus key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  </Card>
));

// Main MatchFlow component
const MatchFlow: React.FC<MatchFlowProps> = ({
  matchState,
  onPhaseEnd,
  onTimeUpdate,
  onStrategyChange,
  onMidRoundCall
}) => {

  if (!matchState || !matchState.teams || !matchState.currentStrategy) {
    return (
      <Card className="p-4 bg-red-900/50">
        <div className="text-center text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h3 className="font-bold">Invalid Match State</h3>
          <p className="text-sm text-red-300 mt-2">Match state not properly initialized</p>
        </div>
      </Card>
    );
  }
  
  const [lastPhase, setLastPhase] = useState(matchState.phase);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    if (matchState.phase !== lastPhase) {
      setLastPhase(matchState.phase);
      handlePhaseChange(matchState.phase);
    }
  }, [matchState.phase, lastPhase, onPhaseEnd]);

  const handlePhaseChange = (phase: string) => {
    try {
      onPhaseEnd();
      if (phase === 'ended') {
        toast.success('Round complete!');
      }
    } catch (error) {
      setErrorState('Error handling phase change');
      toast.error('Failed to process phase change');
    }
  };

  const handleStrategySelect = (team: 't' | 'ct', strategy: string) => {
    try {
      if (matchState.phase !== 'freezetime') {
        toast.error('Strategies can only be changed during freeze time');
        return;
      }
      onStrategyChange(team, strategy);
      toast.success(`Strategy updated: ${strategy}`);
    } catch (error) {
      setErrorState('Error updating strategy');
      toast.error('Failed to update strategy');
    }
  };

  const handleMidRoundCall = (team: 't' | 'ct', call: string) => {
    try {
      if (matchState.phase !== 'live') {
        toast.error('Mid-round calls can only be made during live round');
        return;
      }
      onMidRoundCall(team, call);
      toast.success(`Mid-round call: ${call}`);
    } catch (error) {
      setErrorState('Error making mid-round call');
      toast.error('Failed to make mid-round call');
    }
  };

  if (errorState) {
    return (
      <Card className="p-4 bg-red-900/50">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Error: {errorState}</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PhaseIndicator 
        phase={matchState.phase} 
        timeLeft={matchState.timeLeft} 
      />

      <TeamScore 
        score={matchState.score} 
        round={matchState.round} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* T Side Strategy */}
        <StrategyOverview
        team={matchState.teams?.t}
        strategy={matchState.currentStrategy?.t || 'default'}
        phase={matchState.phase}
        onStrategyChange={(strategy) => handleStrategySelect('t', strategy)}
        onMidRoundCall={(call) => handleMidRoundCall('t', call)}
      />
      
      <StrategyOverview
        team={matchState.teams?.ct}
        strategy={matchState.currentStrategy?.ct || 'default'}
        phase={matchState.phase}
        onStrategyChange={(strategy) => handleStrategySelect('ct', strategy)}
        onMidRoundCall={(call) => handleMidRoundCall('ct', call)}
      />
    </div>

      {/* Round Status */}
      <Card className="bg-gray-800/50 backdrop-blur-sm p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {matchState.phase === 'planted' ? (
              <Trophy className="w-5 h-5 text-red-400" />
            ) : (
              <Timer className="w-5 h-5" />
            )}
            <span className="font-bold">
              {PHASE_MESSAGES[matchState.phase]}
            </span>
          </div>
          {matchState.activeCall && (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span>Active Call: {matchState.activeCall}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MatchFlow;