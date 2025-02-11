"use client";

import React, { 
  createContext, 
  useCallback, 
  useContext, 
  useEffect, 
  useMemo, 
  useState 
} from 'react';
import { toast } from 'sonner';
import GameController from '@/lib/GameController';

// Keep all your existing interfaces
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
  state: GameState;
  controller: GameController;
  actions: {
    startMatch: (config: {
      playerTeam: Agent[];
      botTeam: Agent[];
      config: GameConfig;
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

interface GameProviderProps {
  children: React.ReactNode;
  initialState?: Partial<GameState>;
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

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<GameProviderProps> = ({ 
  children, 
  initialState 
}) => {
  const [mounted, setMounted] = useState(false);
  const [controller, setController] = useState<GameController | null>(null);
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...defaultGameState,
    ...initialState
  }));

  // Initialize controller and handle mounting
  useEffect(() => {
    try {
      setMounted(true);
      const newController = new GameController();
      
      // Initialize controller with default state
      newController.setState(gameState);
      setController(newController);

      return () => {
        if (newController) {
          newController.cleanup();
        }
      };
    } catch (error) {
      console.error('Failed to initialize game controller:', error);
      toast.error('Game initialization failed');
    }
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    if (!controller || !mounted) return;

    try {
      const unsubscribe = controller.subscribe((newState: GameState) => {
        setGameState((prevState) => {
          // Only update if state has actually changed
          if (JSON.stringify(prevState) === JSON.stringify(newState)) {
            return prevState;
          }
          return newState;
        });
      });

      // Start game loop if initial state is provided
      if (initialState) {
        controller.startGameLoop();
      }

      return () => {
        controller.stopGameLoop();
        unsubscribe();
      };
    } catch (error) {
      console.error('Game state subscription error:', error);
      toast.error('Failed to sync game state');
    }
  }, [controller, mounted, initialState]);

  // Game actions
  const startMatch = useCallback(async (config: {
    playerTeam: Agent[],
    botTeam: Agent[],
    config: GameConfig
  }) => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    
    try {
      await controller.initializeMatch(config);
      controller.startGameLoop();
      setGameState(prevState => ({
        ...prevState,
        match: {
          ...prevState.match,
          status: 'active',
          startTime: Date.now()
        }
      }));
      toast.success('Match started successfully');
    } catch (error) {
      console.error('Failed to start match:', error);
      toast.error('Failed to start match');
      throw new Error('Match initialization failed');
    }
  }, [controller]);

  const updateStrategy = useCallback((side: 't' | 'ct', strategy: string) => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.updateStrategy(side, strategy);
      setGameState(prevState => ({
        ...prevState,
        teams: {
          ...prevState.teams,
          [side]: {
            ...prevState.teams[side],
            strategy
          }
        }
      }));
    } catch (error) {
      console.error('Failed to update strategy:', error);
      toast.error('Failed to update strategy');
    }
  }, [controller]);

  const processBuy = useCallback((side: 't' | 'ct', agentId: string, loadout: {
    weapons: string[];
    equipment: string[];
    total: number;
  }) => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.processBuy(side, agentId, loadout);
      // State update handled by controller subscription
    } catch (error) {
      console.error('Failed to process buy:', error);
      toast.error('Failed to process buy');
    }
  }, [controller]);

  const makeMidRoundCall = useCallback((side: 't' | 'ct', call: string) => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.makeMidRoundCall(side, call);
      setGameState(prevState => ({
        ...prevState,
        round: {
          ...prevState.round,
          activeCall: call
        }
      }));
    } catch (error) {
      console.error('Failed to make mid-round call:', error);
      toast.error('Failed to make mid-round call');
    }
  }, [controller]);

  const pauseMatch = useCallback(() => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.pauseMatch();
      setGameState(prevState => ({
        ...prevState,
        match: {
          ...prevState.match,
          status: 'paused'
        }
      }));
      toast.info('Match paused');
    } catch (error) {
      console.error('Failed to pause match:', error);
      toast.error('Failed to pause match');
    }
  }, [controller]);

  const resumeMatch = useCallback(() => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.resumeMatch();
      setGameState(prevState => ({
        ...prevState,
        match: {
          ...prevState.match,
          status: 'active'
        }
      }));
      toast.success('Match resumed');
    } catch (error) {
      console.error('Failed to resume match:', error);
      toast.error('Failed to resume match');
    }
  }, [controller]);

  const endMatch = useCallback(() => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.endMatch();
      setGameState(prevState => ({
        ...prevState,
        match: {
          ...prevState.match,
          status: 'ended',
          endTime: Date.now()
        }
      }));
    } catch (error) {
      console.error('Failed to end match:', error);
      toast.error('Failed to end match');
    }
  }, [controller]);

  const clearCombatResult = useCallback(() => {
    if (!controller) {
      toast.error('Game controller not initialized');
      return;
    }
    try {
      controller.clearCombatResult();
      setGameState(prevState => ({
        ...prevState,
        combatResult: null
      }));
    } catch (error) {
      console.error('Failed to clear combat result:', error);
      toast.error('Failed to clear combat result');
    }
  }, [controller]);

  const value = useMemo(() => ({
    state: gameState,
    controller: controller!,
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

  // Don't render until mounted and controller is initialized
  if (!mounted || !controller) {
    return null;
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hooks remain the same
export function useGame() {
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
  return ['match', 'round', 'teams', 'events'].every(key => key in state);
}

export default GameProvider;