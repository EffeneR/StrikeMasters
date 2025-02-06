// RoomUI.tsx
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Target, 
  Zap, 
  ChevronRight,
  Users,
  TrendingUp,
  Clock,
  Medal
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agent {
  id: string;
  name: string;
  role: string;
  stats: {
    aim: number;
    reaction: number;
    positioning: number;
    utility: number;
    leadership: number;
    clutch: number;
  };
  matchStats?: {
    kills: number;
    deaths: number;
    assists: number;
  };
  strategyStats?: {
    utilityUsage: number;
    positioningScore: number;
    strategyAdherence: number;
    impactRating: number;
  };
}

interface Team {
  id: string;
  name: string;
  agents: Agent[];
  strategyStats?: {
    roundsWonWithStrategy: { [key: string]: number };
    strategySuccessRate: number;
    lastSuccessfulStrategy: string;
  };
}

interface RoomUIProps {
  team: Team;
  onReady: () => void;
  onStrategySelect?: (strategy: string) => void;
}
const STRATEGIES = {
  default: "Default Setup",
  rush_b: "Rush B Execute",
  split_a: "Split A Attack",
  mid_control: "Mid Control",
  eco_rush: "Economy Rush",
  default_defense: "Default Defense",
  aggressive_mid: "Aggressive Mid Control",
  stack_a: "Stack A Site",
  stack_b: "Stack B Site",
  retake_setup: "Retake Setup"
} as const;

const StatBar: React.FC<{ 
  label: string; 
  value: number; 
  color?: string;
}> = ({
  label,
  value,
  color = 'bg-blue-500'
}) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-400 w-24">{label}</span>
    <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-300`} 
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
    <span className="text-sm text-gray-300 w-12 text-right">
      {Math.round(value * 100)}%
    </span>
  </div>
);

const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Entry Fragger': return <Target className="w-4 h-4 text-red-400" />;
      case 'AWPer': return <Zap className="w-4 h-4 text-blue-400" />;
      case 'Support': return <Shield className="w-4 h-4 text-green-400" />;
      case 'In-Game Leader': return <Users className="w-4 h-4 text-yellow-400" />;
      case 'Lurker': return <Clock className="w-4 h-4 text-purple-400" />;
      default: return null;
    }
  };

  const getStatColor = (value: number): string => {
    if (value >= 0.8) return 'bg-green-500';
    if (value >= 0.6) return 'bg-blue-500';
    if (value >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="bg-gray-800 p-4 hover:bg-gray-750 transition-colors">
      <div 
        className="cursor-pointer" 
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {getRoleIcon(agent.role)}
            <span className="font-bold">{agent.name}</span>
          </div>
          <span className="text-sm text-gray-400">{agent.role}</span>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <StatBar 
                label="Aim" 
                value={agent.stats.aim} 
                color={getStatColor(agent.stats.aim)}
              />
              <StatBar 
                label="Reaction" 
                value={agent.stats.reaction} 
                color={getStatColor(agent.stats.reaction)}
              />
              <StatBar 
                label="Positioning" 
                value={agent.stats.positioning} 
                color={getStatColor(agent.stats.positioning)}
              />
              <StatBar 
                label="Utility" 
                value={agent.stats.utility} 
                color={getStatColor(agent.stats.utility)}
              />
              <StatBar 
                label="Leadership" 
                value={agent.stats.leadership} 
                color={getStatColor(agent.stats.leadership)}
              />
              <StatBar 
                label="Clutch" 
                value={agent.stats.clutch} 
                color={getStatColor(agent.stats.clutch)}
              />
            </div>

            {agent.strategyStats && (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <h4 className="text-sm font-bold mb-2">Strategy Performance</h4>
                <StatBar 
                  label="Strategy Adherence" 
                  value={agent.strategyStats.strategyAdherence} 
                  color={getStatColor(agent.strategyStats.strategyAdherence)}
                />
                <StatBar 
                  label="Impact Rating" 
                  value={agent.strategyStats.impactRating} 
                  color={getStatColor(agent.strategyStats.impactRating)}
                />
              </div>
            )}

            {agent.matchStats && (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <h4 className="text-sm font-bold mb-2">Match Stats</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl text-green-400">
                      {agent.matchStats.kills}
                    </div>
                    <div className="text-xs text-gray-400">Kills</div>
                  </div>
                  <div>
                    <div className="text-xl text-red-400">
                      {agent.matchStats.deaths}
                    </div>
                    <div className="text-xs text-gray-400">Deaths</div>
                  </div>
                  <div>
                    <div className="text-xl text-yellow-400">
                      {agent.matchStats.assists}
                    </div>
                    <div className="text-xs text-gray-400">Assists</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
const TeamStats: React.FC<{ team: Team }> = ({ team }) => {
  if (!team.strategyStats) return null;

  const strategies = Object.entries(team.strategyStats.roundsWonWithStrategy)
    .sort(([, a], [, b]) => b - a);

  return (
    <Card className="bg-gray-800 p-4 mb-4">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Team Performance
      </h3>
      
      <div className="space-y-4">
        <StatBar 
          label="Strategy Success" 
          value={team.strategyStats.strategySuccessRate} 
          color={team.strategyStats.strategySuccessRate >= 0.6 ? 'bg-green-500' : 'bg-yellow-500'}
        />

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-bold mb-2">Best Strategies</h4>
          {strategies.map(([strategy, wins], index) => (
            <div 
              key={strategy} 
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                {index === 0 && <Medal className="w-4 h-4 text-yellow-400" />}
                <span className="text-sm">{STRATEGIES[strategy as keyof typeof STRATEGIES] || strategy}</span>
              </div>
              <span className="text-sm text-green-400">{wins} wins</span>
            </div>
          ))}
        </div>

        {team.strategyStats.lastSuccessfulStrategy && (
          <div className="text-sm text-gray-400 mt-2">
            Last Successful: {STRATEGIES[team.strategyStats.lastSuccessfulStrategy as keyof typeof STRATEGIES]}
          </div>
        )}
      </div>
    </Card>
  );
};

const RoomUI: React.FC<RoomUIProps> = ({ team, onReady, onStrategySelect }) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('default');

  const handleStrategySelect = (strategy: string) => {
    setSelectedStrategy(strategy);
    onStrategySelect?.(strategy);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{team.name}</h2>
          <Button 
            onClick={onReady} 
            className="bg-green-600 hover:bg-green-700 transition-colors"
          >
            Ready
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {team.strategyStats && <TeamStats team={team} />}

        {onStrategySelect && (
          <Card className="bg-gray-800 p-4 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Strategy Selection
            </h3>
            
            <Select 
              value={selectedStrategy}
              onValueChange={handleStrategySelect}
            >
              <SelectTrigger className="w-full bg-gray-700">
                <SelectValue placeholder="Select Initial Strategy" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STRATEGIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStrategy && (
              <p className="text-sm text-gray-400 mt-2">
                Selected: {STRATEGIES[selectedStrategy as keyof typeof STRATEGIES]}
              </p>
            )}
          </Card>
        )}

        <div className="grid gap-4">
          {team.agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomUI;