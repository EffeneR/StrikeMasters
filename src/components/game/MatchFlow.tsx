'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  eco_rush: "Economic round with rushed strategy"
};

const DEFAULT_MATCH_STATE: MatchState = {
  phase: 'warmup',
  round: 1,
  score: { t: 0, ct: 0 },
  timeLeft: 0,
  teams: {
    t: { 
      agents: [], 
      strategyStats: { 
        roundsWonWithStrategy: {}, 
        strategySuccessRate: 0, 
        lastSuccessfulStrategy: '' 
      }
    },
    ct: { 
      agents: [], 
      strategyStats: { 
        roundsWonWithStrategy: {}, 
        strategySuccessRate: 0, 
        lastSuccessfulStrategy: '' 
      }
    }
  },
  currentStrategy: { t: 'default', ct: 'default' },
  activeCall: null
};

const PhaseIndicator: React.FC<{ phase: string; timeLeft: number }> = ({ 
  phase, 
  timeLeft 
}) => (
  <Card className={`
    p-4 mb-4 flex justify-between items-center
    ${phase === 'planted' ? 'bg-red-900/50' : 'bg-gray-800/50'}
    backdrop-blur-sm transition-colors duration-200
  `}>
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
);

const TeamScore: React.FC<{ score: { t: number; ct: number }; round: number }> = ({ 
  score, 
  round 
}) => (
  <Card className="bg-gray-800/50 backdrop-blur-sm p-4 mb-4">
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
  <Card className="bg-gray-800/50 backdrop-blur-sm p-4 mb-4">
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
          <Button
            size="sm"
            onClick={() => onStrategyChange('default')}
            variant={strategy === 'default' ? 'default' : 'outline'}
          >
            Default
          </Button>
          <Button
            size="sm"
            onClick={() => onStrategyChange('rush_b')}
            variant={strategy === 'rush_b' ? 'default' : 'outline'}
          >
            Rush B
          </Button>
          <Button
            size="sm"
            onClick={() => onStrategyChange('split_a')}
            variant={strategy === 'split_a' ? 'default' : 'outline'}
          >
            Split A
          </Button>
          <Button
            size="sm"
            onClick={() => onStrategyChange('mid_control')}
            variant={strategy === 'mid_control' ? 'default' : 'outline'}
          >
            Mid Control
          </Button>
        </div>
      )}

      {phase === 'live' && onMidRoundCall && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => onMidRoundCall('rotate_a')}
            className="bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Rotate A
          </Button>
          <Button
            size="sm"
            onClick={() => onMidRoundCall('rotate_b')}
            className="bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Rotate B
          </Button>
          <Button
            size="sm"
            onClick={() => onMidRoundCall('execute')}
            className="bg-green-600 hover:bg-green-700 transition-colors"
          >
            Execute
          </Button>
          <Button
            size="sm"
            onClick={() => onMidRoundCall('hold')}
            className="bg-yellow-600 hover:bg-yellow-700 transition-colors"
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
  const safeMatchState = useMemo(() => {
    if (!matchState || !matchState.teams || !matchState.score) {
      console.warn('Invalid match state detected, using default state');
      return DEFAULT_MATCH_STATE;
    }

    return {
      ...DEFAULT_MATCH_STATE,
      ...matchState,
      score: {
        t: matchState.score?.t ?? 0,
        ct: matchState.score?.ct ?? 0
      },
      teams: {
        t: {
          ...DEFAULT_MATCH_STATE.teams.t,
          ...matchState.teams.t,
          strategyStats: {
            ...DEFAULT_MATCH_STATE.teams.t.strategyStats,
            ...matchState.teams.t?.strategyStats
          }
        },
        ct: {
          ...DEFAULT_MATCH_STATE.teams.ct,
          ...matchState.teams.ct,
          strategyStats: {
            ...DEFAULT_MATCH_STATE.teams.ct.strategyStats,
            ...matchState.teams.ct?.strategyStats
          }
        }
      },
      currentStrategy: {
        t: matchState.currentStrategy?.t ?? 'default',
        ct: matchState.currentStrategy?.ct ?? 'default'
      }
    };
  }, [matchState]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof onTimeUpdate === 'function') {
        onTimeUpdate();
      }
      if (safeMatchState.timeLeft <= 0 && typeof onPhaseEnd === 'function') {
        onPhaseEnd();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [safeMatchState.timeLeft, onPhaseEnd, onTimeUpdate]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <PhaseIndicator 
        phase={safeMatchState.phase} 
        timeLeft={safeMatchState.timeLeft} 
      />

      <TeamScore 
        score={safeMatchState.score} 
        round={safeMatchState.round} 
      />

      <div className="grid md:grid-cols-2 gap-4">
        <StrategyOverview
          team={safeMatchState.teams.t}
          strategy={safeMatchState.currentStrategy.t}
          phase={safeMatchState.phase}
          onStrategyChange={
            safeMatchState.phase === 'freezetime' 
              ? (strategy) => onStrategyChange('t', strategy)
              : undefined
          }
          onMidRoundCall={
            safeMatchState.phase === 'live'
              ? (call) => onMidRoundCall('t', call)
              : undefined
          }
        />

        <StrategyOverview
          team={safeMatchState.teams.ct}
          strategy={safeMatchState.currentStrategy.ct}
          phase={safeMatchState.phase}
          onStrategyChange={
            safeMatchState.phase === 'freezetime' 
              ? (strategy) => onStrategyChange('ct', strategy)
              : undefined
          }
          onMidRoundCall={
            safeMatchState.phase === 'live'
              ? (call) => onMidRoundCall('ct', call)
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default MatchFlow;