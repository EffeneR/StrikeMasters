'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameProvider, useGame } from '@/components/game-provider';
import AgentManager from '@/components/game/AgentManager';
import MatchView from '@/components/game/MatchView';
import RoomLobby from '@/components/game/RoomLobby';
import MatchFlow from '@/components/game/MatchFlow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GameConfig, AgentStats, Agent, Team, GamePhase, MatchState } from '@/types/game';
import { toast } from 'sonner';
import { AlertCircle, RefreshCcw, Shield, Swords, Brain, Trophy } from 'lucide-react';

// Constants
const DIFFICULTY_MODIFIERS = {
  easy: 0.7,
  medium: 0.85,
  hard: 1.0,
  expert: 1.2
} as const;

const DEFAULT_BOT_ROLES = [
  'Entry Fragger',
  'Support',
  'In-Game Leader',
  'AWPer',
  'Support'
] as const;

const DEFAULT_BOT_NAMES = [
  'Bot_Alpha',
  'Bot_Bravo',
  'Bot_Charlie',
  'Bot_Delta',
  'Bot_Echo'
] as const;

const ROLE_BOOSTS: Record<string, Partial<AgentStats>> = {
  'Entry Fragger': { aim: 0.2, reaction: 0.2 },
  'Support': { utility: 0.2, positioning: 0.2 },
  'In-Game Leader': { leadership: 0.3, utility: 0.1 },
  'AWPer': { aim: 0.3, clutch: 0.1 },
  'Lurker': { positioning: 0.2, clutch: 0.2 }
};

const BASE_STATS: AgentStats = {
  aim: 0.5,
  reaction: 0.5,
  positioning: 0.5,
  utility: 0.5,
  leadership: 0.5,
  clutch: 0.5
};

// Helper Functions
const generateDefaultStats = (
  difficulty: number = 0.7,
  role: string
): AgentStats => {
  const boost = ROLE_BOOSTS[role] || {};
  const stats = { ...BASE_STATS };

  Object.keys(stats).forEach(key => {
    const statKey = key as keyof AgentStats;
    stats[statKey] = Math.min(
      1.0,
      (stats[statKey] + (boost[statKey] || 0)) * difficulty
    );
  });

  return stats;
};

const createInitialMatchState = (
  playerTeam: Agent[],
  botTeam: Agent[],
  startingSide: 't' | 'ct'
): MatchState => ({
  round: 1,
  phase: 'freezetime',
  teams: {
    t: {
      score: 0,
      money: 800,
      players: startingSide === 't' ? playerTeam : botTeam
    },
    ct: {
      score: 0,
      money: 800,
      players: startingSide === 'ct' ? playerTeam : botTeam
    }
  },
  isMatchStarted: true
});

// Components
const ErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  onReset?: () => void;
}> = ({ children, onReset }) => {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Game Error:', error);
      setHasError(true);
      setErrorDetails(error.message);
      toast.error('An error occurred in the game');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleReset = () => {
    setHasError(false);
    setErrorDetails('');
    onReset?.();
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <Card className="p-6 max-w-md w-full bg-gray-800">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4 mx-auto" />
          <h2 className="text-xl text-red-500 mb-4 text-center">
            Something went wrong
          </h2>
          {errorDetails && (
            <p className="text-sm text-gray-400 mb-4 text-center">
              {errorDetails}
            </p>
          )}
          <Button 
            onClick={handleReset}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Restart Game
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingView: React.FC<{ message?: string }> = ({ 
  message = 'Loading game...' 
}) => (
  <div className="flex justify-center items-center h-screen bg-gray-900">
    <Card className="p-6 bg-gray-800">
      <div className="text-center">
        <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-white">{message}</p>
      </div>
    </Card>
  </div>
);

const MainMenu: React.FC<{
  onNewGame: () => void;
  onContinue?: () => void;
  hasSavedGame?: boolean;
}> = ({ onNewGame, onContinue, hasSavedGame }) => (
  <div className="flex items-center justify-center min-h-screen">
    <Card className="w-96 p-6 bg-gray-800">
      <h1 className="text-4xl font-bold text-center mb-8">
        StrikeMasters
      </h1>
      <div className="space-y-4">
        <Button
          onClick={onNewGame}
          variant="default"
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Swords className="w-4 h-4 mr-2" />
          New Game
        </Button>
        {hasSavedGame && onContinue && (
          <Button
            onClick={onContinue}
            variant="outline"
            className="w-full"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Continue
          </Button>
        )}
      </div>
    </Card>
  </div>
);

const GameContent: React.FC = () => {
  const { matchState, setMatchState, startMatch, controller } = useGame();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'menu' | 'agents' | 'lobby' | 'match'>('menu');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    const checkSavedGame = async () => {
      try {
        const saved = await controller?.hasSavedGame();
        setHasSavedGame(!!saved);
      } catch (error) {
        console.error('Error checking saved game:', error);
      }
    };

    setMounted(true);
    setIsInitializing(false);
    checkSavedGame();
  }, [controller]);

  const generateBotTeam = useCallback((config: GameConfig): Agent[] => {
    const botSide = config.startingSide === 't' ? 'ct' : 't';
    const difficultyModifier = DIFFICULTY_MODIFIERS[config.difficulty] || 0.85;

    return Array.from({ length: 5 }, (_, i) => ({
      id: `bot-${i}`,
      name: DEFAULT_BOT_NAMES[i],
      team: botSide,
      role: DEFAULT_BOT_ROLES[i],
      position: { x: botSide === 'ct' ? 230 : 60, y: 170 },
      health: 100,
      armor: 0,
      weapons: [botSide === 't' ? 'glock' : 'usp'],
      equipment: [],
      isAlive: true,
      stats: generateDefaultStats(difficultyModifier, DEFAULT_BOT_ROLES[i]),
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

  const handleTeamSelection = useCallback((team: Team) => {
    if (!mounted) return;
    setSelectedTeam(team);
    setView('lobby');
  }, [mounted]);

  const handleMatchStart = useCallback(async (config: GameConfig) => {
    if (!mounted || !selectedTeam) {
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

      const initialState = createInitialMatchState(
        playerTeam,
        botTeam,
        config.startingSide
      );

      setMatchState(initialState);
      await startMatch();
      setGameInitialized(true);
      setView('match');
      toast.success('Match started successfully');
    } catch (error) {
      console.error('Failed to initialize match:', error);
      toast.error('Failed to start match');
    } finally {
      setIsInitializing(false);
    }
  }, [mounted, selectedTeam, generateBotTeam, setMatchState, startMatch]);

  const handlePhaseEnd = useCallback(() => {
    if (!mounted) return;
    try {
      setMatchState(prev => ({
        ...prev,
        phase: prev.phase === 'freezetime' ? 'live' : 'freezetime',
        round: prev.phase === 'over' ? prev.round + 1 : prev.round
      }));
    } catch (error) {
      console.error('Error handling phase end:', error);
      toast.error('Error during phase transition');
    }
  }, [mounted, setMatchState]);

  const handleTimeUpdate = useCallback((timeLeft: number) => {
    if (!mounted) return;
    try {
      controller?.updateTime(timeLeft);
    } catch (error) {
      console.error('Error updating time:', error);
    }
  }, [mounted, controller]);

  const handleStrategyChange = useCallback((side: 't' | 'ct', strategy: string) => {
    if (!mounted) return;
    try {
      controller?.updateStrategy(side, strategy);
      toast.success(`Strategy updated for ${side.toUpperCase()} team`);
    } catch (error) {
      console.error('Error updating strategy:', error);
      toast.error('Failed to update strategy');
    }
  }, [mounted, controller]);

  const handleMidRoundCall = useCallback((side: 't' | 'ct', call: string) => {
    if (!mounted) return;
    try {
      controller?.makeMidRoundCall(side, call);
      toast.success(`Mid-round call made: ${call}`);
    } catch (error) {
      console.error('Error making mid-round call:', error);
      toast.error('Failed to make mid-round call');
    }
  }, [mounted, controller]);

  const renderMatchView = useCallback(() => {
    if (!mounted || !matchState.isMatchStarted || !gameInitialized) {
      return <LoadingView message="Preparing match..." />;
    }

    return (
      <div className="relative">
        <MatchFlow
          matchState={matchState}
          onPhaseEnd={handlePhaseEnd}
          onTimeUpdate={handleTimeUpdate}
          onStrategyChange={handleStrategyChange}
          onMidRoundCall={handleMidRoundCall}
        />
        <MatchView />
      </div>
    );
  }, [
    mounted,
    matchState,
    gameInitialized,
    handlePhaseEnd,
    handleTimeUpdate,
    handleStrategyChange,
    handleMidRoundCall
  ]);

  if (!mounted || isInitializing) {
    return <LoadingView />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {view === 'menu' && (
        <MainMenu
          onNewGame={() => setView('agents')}
          onContinue={hasSavedGame ? () => setView('match') : undefined}
          hasSavedGame={hasSavedGame}
        />
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

const Page: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingView />;
  }

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <GameProvider>
        <GameContent />
      </GameProvider>
    </ErrorBoundary>
  );
};

export default Page;