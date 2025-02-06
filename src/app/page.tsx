'use client';

import React, { useState, useEffect } from 'react'; // Added useEffect
import { GameProvider, useGame } from '@/components/game-provider';
import AgentManager from '@/components/game/AgentManager';
import MatchView from '@/components/game/MatchView';
import RoomLobby from '@/components/game/RoomLobby';
import MatchFlow from '@/components/game/MatchFlow';
import { Button } from '@/components/ui/button';
import { GameConfig, Position, AgentStats, Agent, Team } from '@/types/game';
import { toast } from 'sonner'; // Add toast for notifications

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

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      if (controller) {
        controller.stopGameLoop();
      }
    };
  }, [controller]);

  const handleTeamSelection = (team: Team) => {
    setSelectedTeam(team);
    setView('lobby');
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

  const handleMatchStart = async (config: GameConfig) => {
    if (!selectedTeam) {
      toast.error('No team selected');
      return;
    }

    try {
      const botTeam = generateBotTeam(config);
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

      await controller.initializeMatch({
        playerTeam,
        botTeam,
        config: {
          ...config,
          matchId: Math.random().toString(36).substr(2, 9)
        }
      });

      controller.startGameLoop();
      setGameInitialized(true);
      setView('match');
      toast.success('Match started successfully');
    } catch (error) {
      console.error('Failed to initialize match:', error);
      toast.error('Failed to start match');
    }
  };

  const handlePhaseEnd = () => {
    try {
      controller.handlePhaseEnd();
    } catch (error) {
      console.error('Error handling phase end:', error);
      toast.error('Error during phase transition');
    }
  };

  const handleTimeUpdate = () => {
    try {
      controller.updateTimer();
    } catch (error) {
      console.error('Error updating timer:', error);
      toast.error('Error updating game timer');
    }
  };

  const handleStrategyChange = (side: 't' | 'ct', strategy: string) => {
    try {
      controller.updateStrategy(side, strategy);
      toast.success(`Strategy updated for ${side.toUpperCase()} team`);
    } catch (error) {
      console.error('Error updating strategy:', error);
      toast.error('Failed to update strategy');
    }
  };

  const handleMidRoundCall = (side: 't' | 'ct', call: string) => {
    try {
      controller.makeMidRoundCall(side, call);
      toast.success(`Mid-round call made: ${call}`);
    } catch (error) {
      console.error('Error making mid-round call:', error);
      toast.error('Failed to make mid-round call');
    }
  };

  const renderMatchView = () => {
    if (!state || !gameInitialized) {
      return <div className="flex justify-center items-center h-screen">Loading match...</div>;
    }

    return (
      <div className="relative">
        <MatchFlow
          matchState={state}
          onPhaseEnd={handlePhaseEnd}
          onTimeUpdate={handleTimeUpdate}
          onStrategyChange={handleStrategyChange}
          onMidRoundCall={handleMidRoundCall}
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

const Home: React.FC = () => (
  <GameProvider>
    <GameContent />
  </GameProvider>
);

export default Home;