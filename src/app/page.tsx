'use client';

import React, { useState } from 'react';
import { GameProvider, useGame } from '@/components/game-provider';
import AgentManager from '@/components/game/AgentManager';
import MatchView from '@/components/game/MatchView';
import RoomLobby from '@/components/game/RoomLobby';
import MatchFlow from '@/components/game/MatchFlow';
import { Button } from '@/components/ui/button';
import { GameConfig, Position, AgentStats, Agent, Team } from '@/types/game';

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
    if (!selectedTeam) return;

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

      const initialMatchState = {
        phase: 'warmup' as const,
        round: 1,
        score: { t: 0, ct: 0 },
        timeLeft: 0,
        teams: {
          t: {
            agents: config.startingSide === 't' ? playerTeam : botTeam,
            strategyStats: {
              roundsWonWithStrategy: {},
              strategySuccessRate: 0,
              lastSuccessfulStrategy: ''
            }
          },
          ct: {
            agents: config.startingSide === 'ct' ? playerTeam : botTeam,
            strategyStats: {
              roundsWonWithStrategy: {},
              strategySuccessRate: 0,
              lastSuccessfulStrategy: ''
            }
          }
        },
        currentStrategy: {
          t: 'DEFAULT',
          ct: 'DEFAULT'
        }
      };

      await controller.initializeMatch({
        playerTeam,
        botTeam,
        config: {
          ...config,
          startTime: Date.now(),
          matchId: Math.random().toString(36).substr(2, 9)
        },
        initialState: initialMatchState
      });

      controller.startGameLoop();
      setGameInitialized(true);
      setView('match');
    } catch (error) {
      console.error('Failed to initialize match:', error);
    }
  };

  const renderMatchView = () => {
    if (!state || !gameInitialized) {
      return <div>Loading match...</div>;
    }

    return (
      <div>
        <MatchFlow
          matchState={{
            ...state,
            teams: {
              t: {
                ...state.teams.t,
                strategyStats: state.teams.t?.strategyStats || {
                  roundsWonWithStrategy: {},
                  strategySuccessRate: 0,
                  lastSuccessfulStrategy: ''
                }
              },
              ct: {
                ...state.teams.ct,
                strategyStats: state.teams.ct?.strategyStats || {
                  roundsWonWithStrategy: {},
                  strategySuccessRate: 0,
                  lastSuccessfulStrategy: ''
                }
              }
            }
          }}
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

const Home: React.FC = () => (
  <GameProvider>
    <GameContent />
  </GameProvider>
);

export default Home;
