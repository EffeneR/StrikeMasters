'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameProvider, useGame } from '@/components/game-provider';
import AgentManager from '@/components/game/AgentManager';
import MatchView from '@/components/game/MatchView';
import RoomLobby from '@/components/game/RoomLobby';
import MatchFlow from '@/components/game/MatchFlow';
import { Button } from '@/components/ui/button';
import { GameConfig, Position, AgentStats, Agent, Team } from '@/types/game';
import { toast } from 'sonner';
import { AlertCircle, RefreshCcw } from 'lucide-react';

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

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Game Error:', error);
      setHasError(true);
      toast.error('An error occurred in the game');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl text-red-500 mb-4">Something went wrong</h2>
        <Button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Restart Game
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingView: React.FC = () => (
  <div className="flex justify-center items-center h-screen bg-gray-900">
    <div className="text-center">
      <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
      <p className="text-white">Loading game...</p>
    </div>
  </div>
);

const GameContent: React.FC = () => {
  const { state, controller } = useGame();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'menu' | 'agents' | 'lobby' | 'match'>('menu');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setMounted(true);
    const initializeGame = async () => {
      if (controller) {
        try {
          await Promise.all(
            Object.values(controller.systems).map(system => system.initialize({}))
          );
          setIsInitializing(false);
        } catch (error) {
          console.error('Failed to initialize game systems:', error);
          toast.error('Failed to initialize game systems');
        }
      }
    };

    initializeGame();

    return () => {
      if (controller) {
        controller.cleanup();
      }
    };
  }, [controller]);

  const handleTeamSelection = useCallback((team: Team) => {
    if (!mounted) return;
    setSelectedTeam(team);
    setView('lobby');
  }, [mounted]);

  const generateBotTeam = useCallback((config: GameConfig): Agent[] => {
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
  }, []);

  const handleMatchStart = useCallback(async (config: GameConfig) => {
    if (!mounted || !controller || !selectedTeam) {
      toast.error('Game not ready');
      return;
    }

    try {
      setIsInitializing(true);
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
      setIsInitializing(false);
      toast.success('Match started successfully');
    } catch (error) {
      console.error('Failed to initialize match:', error);
      toast.error('Failed to start match');
      setIsInitializing(false);
    }
  }, [mounted, controller, selectedTeam, generateBotTeam]);

  const handlePhaseEnd = useCallback(() => {
    if (!mounted || !controller) return;
    try {
      controller.handlePhaseEnd();
    } catch (error) {
      console.error('Error handling phase end:', error);
      toast.error('Error during phase transition');
    }
  }, [mounted, controller]);

  const handleTimeUpdate = useCallback(() => {
    if (!mounted || !controller) return;
    try {
      controller.updateTimer();
    } catch (error) {
      console.error('Error updating timer:', error);
      toast.error('Error updating game timer');
    }
  }, [mounted, controller]);

  const handleStrategyChange = useCallback((side: 't' | 'ct', strategy: string) => {
    if (!mounted || !controller) return;
    try {
      controller.updateStrategy(side, strategy);
      toast.success(`Strategy updated for ${side.toUpperCase()} team`);
    } catch (error) {
      console.error('Error updating strategy:', error);
      toast.error('Failed to update strategy');
    }
  }, [mounted, controller]);

  const handleMidRoundCall = useCallback((side: 't' | 'ct', call: string) => {
    if (!mounted || !controller) return;
    try {
      controller.makeMidRoundCall(side, call);
      toast.success(`Mid-round call made: ${call}`);
    } catch (error) {
      console.error('Error making mid-round call:', error);
      toast.error('Failed to make mid-round call');
    }
  }, [mounted, controller]);

  const renderMatchView = useCallback(() => {
    if (!mounted || !state || !gameInitialized) {
      return <LoadingView />;
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
  }, [mounted, state, gameInitialized, handlePhaseEnd, handleTimeUpdate, handleStrategyChange, handleMidRoundCall]);

  if (!mounted || isInitializing) {
    return <LoadingView />;
  }

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingView />;
  }

  return (
    <ErrorBoundary>
      <GameProvider>
        <GameContent />
      </GameProvider>
    </ErrorBoundary>
  );
};

export default Home;