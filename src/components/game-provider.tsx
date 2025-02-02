"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import GameController from '@/lib/GameController';

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
  role: string;
  team: 't' | 'ct';
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
  money: number;
  roundWins: number;
  lossBonus: number;
  timeoutAvailable: boolean;
  strategy: string;
  agents: Agent[];
  strategyStats: {
    roundsWonWithStrategy: { [key: string]: number };
    strategySuccessRate: number;
    lastSuccessfulStrategy: string;
  };
}

interface GameState {
  match: {
    id: string;
    status: 'pending' | 'active' | 'paused' | 'ended';
    currentRound: number;
    maxRounds: number;
    score: { t: number; ct: number };
    winner: 't' | 'ct' | null;
    startTime: number | null;
    endTime: number | null;
  };
  round: {
    phase: 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
    timeLeft: number;
    bombPlanted: boolean;
    bombSite: 'A' | 'B' | null;
    plantTime: number | null;
    winner: 't' | 'ct' | null;
    endReason: string | null;
    currentStrategy: {
      t: string;
      ct: string;
    };
    activeCall: string | null;
  };
  teams: {
    t: Team;
    ct: Team;
  };
  events: any[];
  combatResult: any | null;
}

interface GameConfig {
  maxRounds: number;
  startingSide: 't' | 'ct';
  initialStrategy: string;
  difficulty: string;
}

interface GameContextType {
  state: GameState | null;
  controller: GameController;
  actions: {
    startMatch: (config: {
      playerTeam: Agent[],
      botTeam: Agent[],
      config: GameConfig
    }) => void;
    updateStrategy: (side: 't' | 'ct', strategy: string) => void;
    processBuy: (side: 't' | 'ct', agentId: string, loadout: {
      weapons: string[];
      equipment: string[];
      total: number;
    }) => void;
  };
}

const GameContext = createContext<GameContextType | null>(null);

interface GameProviderProps {
  children: React.ReactNode;
  initialState?: Partial<GameState>;
}

export const GameProvider: React.FC<GameProviderProps> = ({ 
  children, 
  initialState 
}) => {
  const [controller] = useState(() => new GameController());
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (initialState) {
      controller.setState(initialState);
    }

    const unsubscribe = controller.subscribe((newState: GameState) => {
      setGameState(newState);
    });

    return () => {
      unsubscribe();
      if (controller) {
        controller.stopGameLoop();
      }
    };
  }, [controller, initialState]);

  const value: GameContextType = {
    state: gameState,
    controller,
    actions: {
      startMatch: (config: {
        playerTeam: Agent[],
        botTeam: Agent[],
        config: GameConfig
      }) => {
        try {
          controller.initializeMatch(config);
          controller.startGameLoop();
        } catch (error) {
          console.error('Failed to start match:', error);
        }
      },
      updateStrategy: (side: 't' | 'ct', strategy: string) => {
        try {
          if (gameState?.teams[side]) {
            controller.updateStrategy(side, strategy);
          }
        } catch (error) {
          console.error('Failed to update strategy:', error);
        }
      },
      processBuy: (side: 't' | 'ct', agentId: string, loadout: any) => {
        try {
          controller.processBuy(side, agentId, loadout);
        } catch (error) {
          console.error('Failed to process buy:', error);
        }
      }
    }
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export function useGameState<T>(selector: (state: GameState) => T): T | null {
  const { state } = useGame();
  if (!state) return null;
  return selector(state);
}

export function isValidGameState(state: any): state is GameState {
  return (
    state &&
    typeof state === 'object' &&
    'match' in state &&
    'round' in state &&
    'teams' in state
  );
}

export default GameProvider;