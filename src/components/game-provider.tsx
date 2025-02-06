"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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

const defaultGameState: GameState = {
  match: {
    id: '',
    status: 'pending',
    currentRound: 1,
    maxRounds: 30,
    score: { t: 0, ct: 0 },
    winner: null,
    startTime: null,
    endTime: null
  },
  round: {
    phase: 'warmup',
    timeLeft: 15,
    bombPlanted: false,
    bombSite: null,
    plantTime: null,
    winner: null,
    endReason: null,
    currentStrategy: {
      t: 'default',
      ct: 'default'
    },
    activeCall: null
  },
  teams: {
    t: {
      money: 800,
      roundWins: 0,
      lossBonus: 1400,
      timeoutAvailable: true,
      strategy: 'default',
      agents: [],
      strategyStats: {
        roundsWonWithStrategy: {},
        strategySuccessRate: 0,
        lastSuccessfulStrategy: ''
      }
    },
    ct: {
      money: 800,
      roundWins: 0,
      lossBonus: 1400,
      timeoutAvailable: true,
      strategy: 'default',
      agents: [],
      strategyStats: {
        roundsWonWithStrategy: {},
        strategySuccessRate: 0,
        lastSuccessfulStrategy: ''
      }
    }
  },
  events: [],
  combatResult: null
};

interface GameContextType {
  state: GameState | null;
  controller: GameController;
  actions: {
    startMatch: (config: {
      playerTeam: Agent[],
      botTeam: Agent[],
      config: GameConfig
    }) => Promise<void>;
    updateStrategy: (side: 't' | 'ct', strategy: string) => void;
    processBuy: (side: 't' | 'ct', agentId: string, loadout: {
      weapons: string[];
      equipment: string[];
      total: number;
    }) => void;
    makeMidRoundCall: (side: 't' | 'ct', call: string) => void;
    pauseMatch: () => void;
    resumeMatch: () => void;
    endMatch: () => void;
    clearCombatResult: () => void;
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
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...defaultGameState,
    ...initialState
  }));

  useEffect(() => {
    controller.setState(gameState);

    const unsubscribe = controller.subscribe((newState: GameState) => {
      setGameState((prevState) => {
        if (JSON.stringify(prevState) === JSON.stringify(newState)) {
          return prevState;
        }
        return newState;
      });
    });

    if (initialState) {
      controller.startGameLoop();
    }

    return () => {
      controller.stopGameLoop();
      unsubscribe();
    };
  }, [controller, initialState]);

  const startMatch = useCallback(async (config: {
    playerTeam: Agent[],
    botTeam: Agent[],
    config: GameConfig
  }) => {
    try {
      await controller.initializeMatch(config);
      controller.startGameLoop();
    } catch (error) {
      console.error('Failed to start match:', error);
      throw new Error('Match initialization failed');
    }
  }, [controller]);

  const updateStrategy = useCallback((side: 't' | 'ct', strategy: string) => {
    try {
      controller.updateStrategy(side, strategy);
    } catch (error) {
      console.error('Failed to update strategy:', error);
      throw new Error('Strategy update failed');
    }
  }, [controller]);

  const processBuy = useCallback((side: 't' | 'ct', agentId: string, loadout: {
    weapons: string[];
    equipment: string[];
    total: number;
  }) => {
    try {
      controller.processBuy(side, agentId, loadout);
    } catch (error) {
      console.error('Failed to process buy:', error);
      throw new Error('Buy processing failed');
    }
  }, [controller]);

  const makeMidRoundCall = useCallback((side: 't' | 'ct', call: string) => {
    try {
      controller.makeMidRoundCall(side, call);
    } catch (error) {
      console.error('Failed to make mid-round call:', error);
      throw new Error('Mid-round call failed');
    }
  }, [controller]);

  const pauseMatch = useCallback(() => {
    try {
      controller.pauseMatch();
    } catch (error) {
      console.error('Failed to pause match:', error);
      throw new Error('Match pause failed');
    }
  }, [controller]);

  const resumeMatch = useCallback(() => {
    try {
      controller.resumeMatch();
    } catch (error) {
      console.error('Failed to resume match:', error);
      throw new Error('Match resume failed');
    }
  }, [controller]);

  const endMatch = useCallback(() => {
    try {
      controller.endMatch();
    } catch (error) {
      console.error('Failed to end match:', error);
      throw new Error('Match end failed');
    }
  }, [controller]);

  const clearCombatResult = useCallback(() => {
    try {
      controller.clearCombatResult();
    } catch (error) {
      console.error('Failed to clear combat result:', error);
      throw new Error('Clear combat result failed');
    }
  }, [controller]);

  const value = useMemo<GameContextType>(() => ({
    state: gameState,
    controller,
    actions: {
      startMatch,
      updateStrategy,
      processBuy,
      makeMidRoundCall,
      pauseMatch,
      resumeMatch,
      endMatch,
      clearCombatResult
    }
  }), [
    gameState,
    controller,
    startMatch,
    updateStrategy,
    processBuy,
    makeMidRoundCall,
    pauseMatch,
    resumeMatch,
    endMatch,
    clearCombatResult
  ]);

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

export function useGameState<T>(selector: (state: GameState) => T): T {
  const { state } = useGame();
  if (!state) throw new Error('Game state is not initialized');
  return selector(state);
}

export function isValidGameState(state: any): state is GameState {
  if (!state || typeof state !== 'object') return false;
  
  const requiredKeys = ['match', 'round', 'teams', 'events'];
  return requiredKeys.every(key => key in state);
}

export default GameProvider;