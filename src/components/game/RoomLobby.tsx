// RoomLobby.tsx
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Swords,
  Users,
  Map,
  Trophy,
  Settings,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useGame } from '@/components/game-provider';

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
}

interface Team {
  id: string;
  name: string;
  agents: Agent[];
  strategy?: string;
}

interface RoomLobbyProps {
  playerTeam: Team;
  onStart: (config: GameConfig) => void;
}

interface GameConfig {
  maxRounds: number;
  startingSide: 't' | 'ct';
  initialStrategy: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const MAP_STRATEGIES = {
  t_side: [
    { value: 'default', label: 'Default Setup' },
    { value: 'rush_b', label: 'Rush B' },
    { value: 'split_a', label: 'Split A' },
    { value: 'mid_control', label: 'Mid Control' },
    { value: 'fake_a_b', label: 'Fake A to B' },
    { value: 'eco_rush', label: 'Eco Rush' }
  ],
  ct_side: [
    { value: 'default', label: 'Default Setup' },
    { value: 'aggressive_mid', label: 'Aggressive Mid' },
    { value: 'stack_a', label: 'Stack A' },
    { value: 'stack_b', label: 'Stack B' },
    { value: 'retake_setup', label: 'Retake Setup' }
  ]
} as const;
const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  default: "Balanced setup with standard positions",
  rush_b: "Fast B execute with full team commitment",
  split_a: "Split attack through Long and Short A",
  mid_control: "Secure mid control before site hit",
  fake_a_b: "Fake presence at A before B execute",
  eco_rush: "Economic round with rushed strategy",
  aggressive_mid: "Control mid with aggressive positioning",
  stack_a: "Stack multiple players on A site",
  stack_b: "Stack multiple players on B site",
  retake_setup: "Setup for retake scenarios"
};

const RoomLobby: React.FC<RoomLobbyProps> = ({ playerTeam, onStart }) => {
  const { controller } = useGame();
  const [config, setConfig] = useState<GameConfig>({
    maxRounds: 24,
    startingSide: 't',
    initialStrategy: 'default',
    difficulty: 'medium'
  });

  const [showTeamDetails, setShowTeamDetails] = useState(true);
  const [showStrategyDetails, setShowStrategyDetails] = useState(true);

  const getTeamStrength = (team: Team): number => {
    if (!team.agents.length) return 0;

    const totalStats = team.agents.reduce((sum, agent) => (
      sum + 
      agent.stats.aim +
      agent.stats.reaction +
      agent.stats.positioning +
      agent.stats.utility +
      agent.stats.leadership +
      agent.stats.clutch
    ), 0);

    return totalStats / (team.agents.length * 6);
  };

  const getDifficultyModifier = (difficulty: string): number => {
    switch (difficulty) {
      case 'easy': return 0.8;
      case 'hard': return 1.2;
      default: return 1.0;
    }
  };

  const generateBotTeam = (config: GameConfig) => {
    const difficultyModifier = getDifficultyModifier(config.difficulty);
    const botRoles = ['Entry Fragger', 'Support', 'In-Game Leader', 'Support', 'Entry Fragger'];
    
    return Array.from({ length: 5 }, (_, i) => ({
      id: `bot-${i}`,
      name: `Bot_${i + 1}`,
      team: config.startingSide === 't' ? 'ct' : 't',
      role: botRoles[i],
      position: { x: 60, y: 180 },
      health: 100,
      armor: 0,
      weapons: [config.startingSide === 't' ? 'glock' : 'usp'],
      equipment: [],
      isAlive: true,
      stats: {
        aim: 0.5 * difficultyModifier + Math.random() * 0.2,
        reaction: 0.5 * difficultyModifier + Math.random() * 0.2,
        positioning: 0.5 * difficultyModifier + Math.random() * 0.2,
        utility: 0.5 * difficultyModifier + Math.random() * 0.2,
        leadership: 0.5 * difficultyModifier + Math.random() * 0.2,
        clutch: 0.5 * difficultyModifier + Math.random() * 0.2
      },
      matchStats: {
        kills: 0,
        deaths: 0,
        assists: 0,
        utilityDamage: 0,
        flashAssists: 0
      },
      strategyStats: {
        utilityUsage: 0,
        positioningScore: 0,
        strategyAdherence: 0,
        impactRating: 0
      }
    }));
  };

  const handleStartMatch = async () => {
    try {
      const initializedPlayerTeam = playerTeam.agents.map(agent => ({
        ...agent,
        team: config.startingSide,
        position: { x: config.startingSide === 't' ? 60 : 230, y: 180 },
        health: 100,
        armor: 0,
        weapons: [config.startingSide === 't' ? 'glock' : 'usp'],
        equipment: [],
        matchStats: {
          kills: 0,
          deaths: 0,
          assists: 0,
          utilityDamage: 0,
          flashAssists: 0
        },
        strategyStats: {
          utilityUsage: 0,
          positioningScore: 0,
          strategyAdherence: 0,
          impactRating: 0
        },
        isAlive: true
      }));

      const botTeam = generateBotTeam(config);

      await controller.initializeMatch({
        playerTeam: initializedPlayerTeam,
        botTeam,
        config: {
          ...config,
          startTime: Date.now(),
          matchId: Math.random().toString(36).substr(2, 9)
        }
      });

      onStart(config);
    } catch (error) {
      console.error('Error starting match:', error);
    }
  };
  const TeamDisplay = () => (
    <Card className="bg-gray-800 p-6 mb-4">
      <div 
        className="flex justify-between items-center cursor-pointer mb-4"
        onClick={() => setShowTeamDetails(!showTeamDetails)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h3 className="text-lg font-bold">Team Composition</h3>
        </div>
        <span className="text-sm text-gray-400">
          Team Strength: {Math.round(getTeamStrength(playerTeam) * 100)}%
        </span>
      </div>

      {showTeamDetails && (
        <div className="space-y-3">
          {playerTeam.agents.map(agent => (
            <div key={agent.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
              <div>
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-gray-400">{agent.role}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  Aim: {Math.round(agent.stats.aim * 100)}%
                </div>
                <div className="text-sm text-gray-400">
                  Role Rating: {Math.round(
                    (agent.stats.aim + 
                     agent.stats.positioning + 
                     agent.stats.utility) / 3 * 100
                  )}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const StrategySetup = () => (
    <Card className="bg-gray-800 p-6 mb-4">
      <div 
        className="flex justify-between items-center cursor-pointer mb-4"
        onClick={() => setShowStrategyDetails(!showStrategyDetails)}
      >
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5" />
          <h3 className="text-lg font-bold">Strategy Setup</h3>
        </div>
      </div>

      {showStrategyDetails && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Starting Side</label>
            <Select
              value={config.startingSide}
              onValueChange={(value: 't' | 'ct') => 
                setConfig(prev => ({ ...prev, startingSide: value }))
              }
            >
              <SelectTrigger className="w-full bg-gray-700">
                <SelectValue placeholder="Select starting side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="t">Terrorists</SelectItem>
                <SelectItem value="ct">Counter-Terrorists</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Initial Strategy</label>
            <Select
              value={config.initialStrategy}
              onValueChange={(value) => 
                setConfig(prev => ({ ...prev, initialStrategy: value }))
              }
            >
              <SelectTrigger className="w-full bg-gray-700">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {MAP_STRATEGIES[`${config.startingSide}_side`].map(strategy => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-400 mt-2">
              {STRATEGY_DESCRIPTIONS[config.initialStrategy]}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
  const MatchSetup = () => (
    <Card className="bg-gray-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" />
        <h3 className="text-lg font-bold">Match Settings</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Max Rounds</label>
          <Select
            value={config.maxRounds.toString()}
            onValueChange={(value) => 
              setConfig(prev => ({ ...prev, maxRounds: parseInt(value) }))
            }
          >
            <SelectTrigger className="w-full bg-gray-700">
              <SelectValue placeholder="Select max rounds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16">MR8 (16 Rounds)</SelectItem>
              <SelectItem value="24">MR12 (24 Rounds)</SelectItem>
              <SelectItem value="30">MR15 (30 Rounds)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Bot Difficulty</label>
          <Select
            value={config.difficulty}
            onValueChange={(value: 'easy' | 'medium' | 'hard') => 
              setConfig(prev => ({ ...prev, difficulty: value }))
            }
          >
            <SelectTrigger className="w-full bg-gray-700">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-400 mt-2">
            Bot Skill Modifier: {getDifficultyModifier(config.difficulty)}x
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Match Setup</h2>
          <Button 
            onClick={handleStartMatch}
            className="bg-green-600 hover:bg-green-700"
          >
            Start Match
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <TeamDisplay />
          <StrategySetup />
          <MatchSetup />
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;