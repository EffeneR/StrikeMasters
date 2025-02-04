// page.tsx
'use client';

import React, { useState } from 'react';
import { GameProvider, useGame } from '@/components/game-provider';
import AgentManager from '@/components/game/AgentManager';
import MatchView from '@/components/game/MatchView';
import RoomLobby from '@/components/game/RoomLobby';
import MatchFlow from '@/components/game/MatchFlow';
import { Button } from '@/components/ui/button';

interface GameConfig {
  maxRounds: number;
  startingSide: 't' | 'ct';
  initialStrategy: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Position {
  x: number;
  y: number;
}

interface AgentStats {
  aim: number;
  reaction: number;
  positioning: number;
  utility: number;
  leadership: number;
  clutch: number;
}

interface Agent {
  id: string;
  name: string;
  team: 't' | 'ct';
  role: string;
  position: Position;
  isAlive: boolean;
  health: number;
  armor: number;
  weapons: string[];
  equipment: string[];
  stats: AgentStats;
  matchStats: {
    kills: number;
    deaths: number;
    assists: number;
    utilityDamage: number;
    flashAssists: number;
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
  strategy?: string;
}

const generateDefaultStats = (
  difficulty: number = 0.7,
  role: string
): AgentStats => {
  const baseStats = {
    aim: 0.5,
    reaction: 0.5,
    positioning: 0.5,
    utility: 0.5,
    leadership: 0.5,
    clutch: 0.5
  };

  const roleBoosts: { [key: string]: Partial<AgentStats> } = {
    'Entry Fragger': { aim: 0.2, reaction: 0.2 },
    'Support': { utility: 0.2, positioning: 0.2 },
    'In-Game Leader': { leadership: 0.3, utility: 0.1 },
    'AWPer': { aim: 0.3, clutch: 0.1 },
    'Lurker': { positioning: 0.2, clutch: 0.2 }
  };

  const boost = roleBoosts[role] || {};
  const stats = { ...baseStats };

  Object.keys(stats).forEach(key => {
    const statKey = key as keyof AgentStats;
    stats[statKey] = Math.min(
      1.0,
      (stats[statKey] + (boost[statKey] || 0)) * difficulty
    );
  });

  return stats;
};

const GameContent: React.FC = () => {
  const { state, controller } = useGame();
  const [view, setView] = useState<'menu' | 'agents' | 'lobby' | 'match'>('menu');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [gameInitialized, setGameInitialized] = useState(false);

  const handleTeamSelection = (team: Team) => {
    setSelectedTeam(team);
    setView('lobby');
  };

  const handleMatchStart = async (config: GameConfig) => {
    if (!selectedTeam) return;
    try {
      // Generate bot team
      const botTeam = generateBotTeam(config);

      // Initialize player team
      const playerTeam = selectedTeam.agents.map(agent => ({
        ...agent,
        team: config.startingSide,
        position: { x: config.startingSide === 't' ? 60 : 230, y: 180 },
        health: 100,
        armor: 0,
        weapons: [config.startingSide === 't' ? 'glock' : 'usp'],
        equipment: [],
        isAlive: true,
        stats: agent.stats || generateDefaultStats(0.85, agent.role),
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

      // Initialize match
      await controller.initializeMatch({
        playerTeam,
        botTeam,
        config: {
          ...config,
          startTime: Date.now(),
          matchId: Math.random().toString(36).substr(2, 9)
        }
      });

      // Start game loop and set state
      controller.startGameLoop();
      setGameInitialized(true);
      setView('match');
    } catch (error) {
      console.error('Failed to initialize match:', error);
    }
  };

  const generateBotTeam = (config: GameConfig): Agent[] => {
    const botSide = config.startingSide === 't' ? 'ct' : 't';
    const difficultyModifier = {
      'easy': 0.7,
      'medium': 0.85,
      'hard': 1.0
    }[config.difficulty] || 0.85;

    const roles = ['Entry Fragger', 'Support', 'In-Game Leader', 'AWPer', 'Support'];
    const names = ['Bot_Alpha', 'Bot_Bravo', 'Bot_Charlie', 'Bot_Delta', 'Bot_Echo'];

    return Array.from({ length: 5 }, (_, i) => ({
      id: `bot-${i}`,
      name: names[i],
      team: botSide,
      role: roles[i],
      position: { x: botSide === 'ct' ? 230 : 60, y: 170 },
      health: 100,
      armor: 0,
      weapons: [botSide === 't' ? 'glock' : 'usp'],
      equipment: [],
      isAlive: true,
      stats: generateDefaultStats(difficultyModifier, roles[i]),
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

  const renderMatchView = () => {
    if (!state || !gameInitialized) return null;

    return (
      <div>
        <MatchFlow
          matchState={state}
          onPhaseEnd={() => controller.handlePhaseEnd()}
          onTimeUpdate={() => controller.updateTimer()}
          onStrategyChange={(side: 't' | 'ct', strategy: string) => 
            controller.updateStrategy(side, strategy)
          }
          onMidRoundCall={(side: 't' | 'ct', call: string) => 
            controller.processMidRoundCall(side, call)
          }
        />
        <MatchView />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {view === 'menu' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-96 space-y-4">
            <h1 className="text-4xl font-bold text-center mb-8">
              StrikeMasters
            </h1>
            <Button
              onClick={() => setView('agents')}
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              New Game
            </Button>
          </div>
        </div>
      )}

      {view === 'agents' && (
        <AgentManager onTeamReady={handleTeamSelection} />
      )}

      {view === 'lobby' && selectedTeam && (
        <RoomLobby
          playerTeam={selectedTeam}
          onStart={handleMatchStart}
        />
      )}

      {view === 'match' && renderMatchView()}
    </div>
  );
};

const Home: React.FC = () => {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
};

export default Home;