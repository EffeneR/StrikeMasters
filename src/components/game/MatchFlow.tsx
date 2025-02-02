// MatchFlow.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, Timer, Trophy, AlertCircle } from 'lucide-react';

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

const PHASE_MESSAGES = {
  warmup: "Prepare for the round",
  freezetime: "Buy phase - Select your strategy",
  live: "Round in progress",
  planted: "Bomb has been planted!",
  ended: "Round Over"
};

const STRATEGY_DESCRIPTIONS = {
  default: "Balanced setup with standard positions",
  rush_b: "Fast B execute with full team commitment",
  split_a: "Split attack through Long and Short A",
  mid_control: "Secure mid control before site hit",
  fake_a_b: "Fake presence at A before B execute",
  eco_rush: "Economic round with rushed strategy"
};

const PhaseIndicator: React.FC<{ phase: string; timeLeft: number }> = ({ 
  phase, 
  timeLeft 
}) => (
  <Card className={`
    p-4 mb-4 flex justify-between items-center
    ${phase === 'planted' ? 'bg-red-900' : 'bg-gray-800'}
  `}>
    <div className="flex items-center gap-2">
      {phase === 'planted' ? (
        <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
      ) : (
        <Timer className="w-5 h-5" />
      )}
      <span className="font-bold">{PHASE_MESSAGES[phase]}</span>
    </div>
    <span className="text-xl font-mono">
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
    </span>
  </Card>
);

const TeamScore: React.FC<{ 
  score: { t: number; ct: number }; 
  round: number 
}> = ({ score, round }) => (
  <Card className="bg-gray-800 p-4 mb-4">
    <div className="text-center">
      <div className="text-3xl font-bold mb-2">
        <span className="text-yellow-400">{score.t}</span>
        {' : '}
        <span className="text-blue-400">{score.ct}</span>
      </div>
      <div className="text-gray-400">Round {round}</div>
    </div>
  </Card>
);

const StrategyOverview: React.FC<{
  team: Team;
  strategy: string;
  phase: string;
  onStrategyChange?: (strategy: string) => void;
  onMidRoundCall?: (call: string) => void;
}> = ({
  team,
  strategy,
  phase,
  onStrategyChange,
  onMidRoundCall
}) => (
  <Card className="bg-gray-800 p-4 mb-4">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <Swords className="w-5 h-5" />
        <h3 className="font-bold">Strategy Overview</h3>
      </div>
      {team.strategyStats && (
        <span className="text-sm text-gray-400">
          Success Rate: {Math.round(team.strategyStats.strategySuccessRate * 100)}%
        </span>
      )}
    </div>

    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-400 mb-1">Current Strategy</div>
        <div className="font-medium">{strategy}</div>
        <div className="text-sm text-gray-400 mt-1">
          {STRATEGY_DESCRIPTIONS[strategy]}
        </div>
      </div>

      {phase === 'live' && onMidRoundCall && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => onMidRoundCall('rotate_a')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Rotate A
          </Button>
          <Button
            size="sm"
            onClick={() => onMidRoundCall('rotate_b')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Rotate B
          </Button>
          <Button
            size="sm"
            onClick={() => onMidRoundCall('execute')}
            className="bg-green-600 hover:bg-green-700"
          >
            Execute
          </Button>
          <Button
            size="sm"
            onClick={() => onMidRoundCall('hold')}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Hold Positions
          </Button>
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm text-gray-400 mb-2">Team Performance</div>
        {team.agents.map(agent => (
          <div key={agent.id} className="flex justify-between items-center mb-2">
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
        ))}
      </div>
    </div>
  </Card>
);

const MatchFlow: React.FC<MatchFlowProps> = ({
  matchState,
  onPhaseEnd,
  onTimeUpdate,
  onStrategyChange,
  onMidRoundCall
}) => {
  useEffect(() => {
    const timer = setInterval(() => {
      onTimeUpdate();
      if (matchState.timeLeft <= 0) {
        onPhaseEnd();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [matchState.timeLeft, onPhaseEnd, onTimeUpdate]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <PhaseIndicator 
        phase={matchState.phase} 
        timeLeft={matchState.timeLeft} 
      />

      <TeamScore 
        score={matchState.score} 
        round={matchState.round} 
      />

      <div className="grid md:grid-cols-2 gap-4">
        <StrategyOverview
          team={matchState.teams.t}
          strategy={matchState.currentStrategy.t}
          phase={matchState.phase}
          onStrategyChange={
            matchState.phase === 'freezetime' 
              ? (strategy) => onStrategyChange('t', strategy)
              : undefined
          }
          onMidRoundCall={
            matchState.phase === 'live'
              ? (call) => onMidRoundCall('t', call)
              : undefined
          }
        />

        <StrategyOverview
          team={matchState.teams.ct}
          strategy={matchState.currentStrategy.ct}
          phase={matchState.phase}
        />
      </div>
    </div>
  );
};

export default MatchFlow;