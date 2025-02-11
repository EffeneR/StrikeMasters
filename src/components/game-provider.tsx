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

  export function GameProvider({ children }: { children: React.ReactNode }) {
    const [matchState, setMatchState] = useState<MatchState>({
      round: 1,
      phase: 'freezetime',
      teams: {
        t: {
          score: 0,
          money: 800,
          players: defaultTPlayers
        },
        ct: {
          score: 0,
          money: 800,
          players: defaultCTPlayers
        }
      },
      isMatchStarted: false
    });
  
    const startMatch = useCallback(() => {
      setMatchState(prev => ({
        ...prev,
        isMatchStarted: true
      }));
    }, []);
  
    const value = {
      matchState,
      setMatchState,
      startMatch
    };
  
    return (
      <GameContext.Provider value={value}>
        {children}
      </GameContext.Provider>
    );
  }

  // Handle mounting
  useEffect(() => {
    setMounted(true);
    const newController = GameController.getInstance(); // Use getInstance instead of new
    setController(newController);
  
    return () => {
      if (newController) {
        newController.cleanup();
      }
    };
  }, []);

  // Handle game state
  useEffect(() => {
    if (!controller || !mounted) return;

    try {
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
    } catch (error) {
      console.error('Game controller initialization error:', error);
      toast.error('Failed to initialize game controller');
    }
  }, [controller, initialState, mounted]);

  const startMatch = useCallback(async (config: {
    playerTeam: Agent[],
    botTeam: Agent[],
    config: GameConfig
  }) => {
    if (!controller) return;
    
    try {
      await controller.initializeMatch(config);
      controller.startGameLoop();
      toast.success('Match started successfully');
    } catch (error) {
      console.error('Failed to start match:', error);
      toast.error('Failed to start match');
      throw new Error('Match initialization failed');
    }
  }, [controller]);

  const updateStrategy = useCallback((side: 't' | 'ct', strategy: string) => {
    if (!controller) return;

    try {
      controller.updateStrategy(side, strategy);
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
    if (!controller) return;

    try {
      controller.processBuy(side, agentId, loadout);
    } catch (error) {
      console.error('Failed to process buy:', error);
      toast.error('Failed to process buy');
    }
  }, [controller]);

  const makeMidRoundCall = useCallback((side: 't' | 'ct', call: string) => {
    if (!controller) return;

    try {
      controller.makeMidRoundCall(side, call);
    } catch (error) {
      console.error('Failed to make mid-round call:', error);
      toast.error('Failed to make mid-round call');
    }
  }, [controller]);

  const pauseMatch = useCallback(() => {
    if (!controller) return;

    try {
      controller.pauseMatch();
      toast.info('Match paused');
    } catch (error) {
      console.error('Failed to pause match:', error);
      toast.error('Failed to pause match');
    }
  }, [controller]);

  const resumeMatch = useCallback(() => {
    if (!controller) return;

    try {
      controller.resumeMatch();
      toast.success('Match resumed');
    } catch (error) {
      console.error('Failed to resume match:', error);
      toast.error('Failed to resume match');
    }
  }, [controller]);

  const endMatch = useCallback(() => {
    if (!controller) return;

    try {
      controller.endMatch();
    } catch (error) {
      console.error('Failed to end match:', error);
      toast.error('Failed to end match');
    }
  }, [controller]);

  const clearCombatResult = useCallback(() => {
    if (!controller) return;

    try {
      controller.clearCombatResult();
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

  if (!mounted || !controller) {
    return null;
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

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
  
  const requiredKeys = ['match', 'round', 'teams', 'events'];
  return requiredKeys.every(key => key in state);
}

export default GameProvider;