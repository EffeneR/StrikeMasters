import CombatSystem from '@/lib/systems/CombatSystem';
import MovementSystem from '@/lib/systems/MovementSystem';
import RoundSystem from '@/lib/systems/RoundSystem';
import BuySystem from '@/lib/systems/BuySystem';
import AgentSystem from '@/lib/systems/AgentSystem';
import Dust2TacticsSystem from '@/lib/systems/Dust2TacticsSystem';
import { toast } from 'sonner';

interface Position {
  x: number;
  y: number;
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
  stats: {
    aim: number;
    reaction: number;
    positioning: number;
    utility: number;
    leadership: number;
    clutch: number;
  };
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

interface CombatResult {
  id: string;
  type: 'kill' | 'damage' | 'utility' | 'trade' | 'assist';
  attacker: {
    id: string;
    name: string;
    team: 't' | 'ct';
    role: string;
  };
  victim?: {
    id: string;
    name: string;
    team: 't' | 'ct';
    role: string;
  };
  weapon?: string;
  damage?: number;
  isHeadshot?: boolean;
  isStrategyKill?: boolean;
  isTradeKill?: boolean;
  isWallbang?: boolean;
  position?: Position;
  timestamp: number;
}

interface GameEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
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
    map: {
      name: string;
      areas: string[];
      callouts: Record<string, any>;
    };
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
    momentum: {
      team: 't' | 'ct' | null;
      factor: number;
    };
  };
  teams: {
    t: Team;
    ct: Team;
  };
  events: GameEvent[];
  combatResult: CombatResult | null;
  meta: {
    version: string;
    timestamp: number;
    tickRate: number;
  };
}

export default class GameController {
  private static instance: GameController | null = null;
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  private gameLoopInterval: NodeJS.Timer | null = null;
  private lastCombatProcess: number = 0;
  private lastStateUpdate: number = 0;
  private readonly updateThrottle: number = 16;
  private isProcessingUpdate: boolean = false;
  private debugMode: boolean = process.env.NODE_ENV === 'development';
  private isBrowser: boolean = typeof window !== 'undefined';

  private systems: {
    combat: CombatSystem;
    movement: MovementSystem;
    round: RoundSystem;
    buy: BuySystem;
    agent: AgentSystem;
    tactics: Dust2TacticsSystem;
  };

  private readonly ROUND_TIMES = {
    warmup: 15,
    freezetime: 15,
    live: 115,
    planted: 40
  };

  private constructor() {
    if (GameController.instance) {
      throw new Error('Use GameController.getInstance() instead');
    }

    // Initialize systems only if we're in the browser
    if (this.isBrowser) {
      this.systems = {
        combat: new CombatSystem(),
        movement: new MovementSystem(),
        round: new RoundSystem(),
        buy: new BuySystem(),
        agent: new AgentSystem(),
        tactics: new Dust2TacticsSystem()
      };
    }

    this.state = this.createInitialState();
    this.setupErrorHandlers();
  }

  public static getInstance(): GameController {
    if (!GameController.instance) {
      GameController.instance = new GameController();
    }
    return GameController.instance;
  }

  public plantBomb(site: 'A' | 'B'): void {
    if (this.state.round.phase !== 'live') return;
    
    this.state.round.bombPlanted = true;
    this.state.round.bombSite = site;
    this.state.round.plantTime = Date.now();
    this.state.round.phase = 'planted';
    this.state.round.timeLeft = this.ROUND_TIMES.planted;
    
    this.notifyListeners();
    toast.info(`Bomb planted at ${site} site`);
  }
  
  public defuseBomb(): void {
    if (!this.state.round.bombPlanted) return;
    
    this.state.round.bombPlanted = false;
    this.endRound('ct', 'Bomb defused');
  }

  private createInitialState(): GameState {
    const defaultState: GameState = {
      match: {
        id: '',
        status: 'pending',
        currentRound: 1,
        maxRounds: 30,
        score: { t: 0, ct: 0 },
        winner: null,
        startTime: null,
        endTime: null,
        map: {
          name: 'de_dust2',
          areas: ['A', 'B', 'Mid', 'T_Spawn', 'CT_Spawn'],
          callouts: {}
        }
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
        activeCall: null,
        momentum: {
          team: null,
          factor: 0
        }
      },
      teams: {
        t: this.createDefaultTeam(),
        ct: this.createDefaultTeam()
      },
      events: [],
      combatResult: null,
      meta: {
        version: '1.0.0',
        timestamp: Date.now(),
        tickRate: 64
      }
    };

    return defaultState;
  }

  public setState(newState: Partial<GameState>): void {
    if (!this.isBrowser) return;

    try {
      const timestamp = Date.now();
      if (timestamp - this.lastStateUpdate < this.updateThrottle) return;

      this.state = {
        ...this.state,
        ...newState,
        meta: {
          ...this.state.meta,
          timestamp
        }
      };
      
      this.lastStateUpdate = timestamp;
      this.notifyListeners();
    } catch (error) {
      console.error('Error setting game state:', error);
      toast.error('Failed to update game state');
    }
  }

  private notifyListeners(): void {
    if (this.isProcessingUpdate) return;
    
    try {
      this.isProcessingUpdate = true;
      const stateSnapshot = JSON.parse(JSON.stringify(this.state)) as GameState;
      this.listeners.forEach(listener => {
        try {
          listener(stateSnapshot);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    } finally {
      this.isProcessingUpdate = false;
    }
  }

  public async initializeMatch(config: {
    playerTeam: Agent[];
    botTeam: Agent[];
    config: {
      maxRounds: number;
      startingSide: 't' | 'ct';
      initialStrategy: string;
      difficulty: string;
      matchId: string;
    };
  }): Promise<void> {
    try {
      if (!config.playerTeam?.length || !config.botTeam?.length) {
        throw new Error('Invalid team configuration');
      }

      this.state.match.id = config.config.matchId;
      this.state.match.status = 'active';
      this.state.match.currentRound = 1;
      this.state.match.maxRounds = config.config.maxRounds;
      this.state.match.startTime = Date.now();

      this.state.teams[config.config.startingSide].agents = config.playerTeam;
      this.state.teams[config.config.startingSide === 't' ? 'ct' : 't'].agents = config.botTeam;

      Object.values(this.systems).forEach(system => system.initialize(this.state));
      this.notifyListeners();

      toast.success('Match initialized successfully');
    } catch (error) {
      console.error('Error initializing match:', error);
      toast.error('Failed to initialize match');
      throw error;
    }
  }

  public startGameLoop(): void {
    try {
      if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = setInterval(() => this.update(1000/60), 1000/60);
      toast.success('Game loop started');
    } catch (error) {
      console.error('Error starting game loop:', error);
      toast.error('Failed to start game loop');
    }
  }

  private update(deltaTime: number): void {
    try {
      if (this.state.match.status !== 'active') return;

      this.updateTimer(deltaTime);
      this.updateMovement(deltaTime);
      this.processCombat();

      this.notifyListeners();
    } catch (error) {
      console.error('Error in game update loop:', error);
      this.pauseMatch();
      toast.error('Game loop error detected');
    }
  }

  private updateMomentum(winner: 't' | 'ct'): void {
    const currentMomentum = this.state.round.momentum;
    
    if (currentMomentum.team === winner) {
      currentMomentum.factor = Math.min(currentMomentum.factor + 0.2, 1);
    } else {
      currentMomentum.team = winner;
      currentMomentum.factor = 0.2;
    }
  }

  private updateTimer(deltaTime: number): void {
    if (this.state.round.timeLeft > 0) {
      this.state.round.timeLeft -= deltaTime / 1000;
      if (this.state.round.timeLeft <= 0) {
        this.handlePhaseEnd();
      }
    }
  }

  private setupErrorHandlers(): void {
    if (this.isBrowser) {
      window.onerror = (msg, url, lineNo, columnNo, error) => {
        console.error('Game Error:', { msg, url, lineNo, columnNo, error });
        toast.error('Game error detected');
        this.pauseMatch();
        return false;
      };
    }
  }

  private updateMovement(deltaTime: number): void {
    ['t', 'ct'].forEach(side => {
      const team = this.state.teams[side as 't' | 'ct'];
      this.systems.movement.updatePositions(
        team.agents,
        this.state.round.phase,
        deltaTime,
        team.strategy,
        this.state.round.activeCall
      );
    });
  }

  private processCombat(): void {
    const now = Date.now();
    if (now - this.lastCombatProcess >= 500) {
      const combatResults = this.systems.combat.processCombatRound(
        [...this.state.teams.t.agents, ...this.state.teams.ct.agents],
        this.state,
        { 
          t: this.state.teams.t.strategy, 
          ct: this.state.teams.ct.strategy 
        }
      );

      if (combatResults.length > 0) {
        this.state.combatResult = combatResults[combatResults.length - 1];
        this.handleCombatResult(this.state.combatResult);
      }

      this.lastCombatProcess = now;
    }
  }

  private handleCombatResult(result: CombatResult): void {
    try {
      if (result.type === 'kill') {
        const victim = this.findAgent(result.victim?.id || '');
        const attacker = this.findAgent(result.attacker.id);
        
        if (victim && attacker) {
          victim.isAlive = false;
          attacker.matchStats.kills++;
          victim.matchStats.deaths++;
          
          this.checkRoundEnd();
        }
      }
    } catch (error) {
      console.error('Error handling combat result:', error);
    }
  }

  private checkRoundEnd(): void {
    const tAlive = this.state.teams.t.agents.some(agent => agent.isAlive);
    const ctAlive = this.state.teams.ct.agents.some(agent => agent.isAlive);

    if (!tAlive && ctAlive) {
      this.endRound('ct', 'All terrorists eliminated');
    } else if (tAlive && !ctAlive) {
      this.endRound('t', 'All counter-terrorists eliminated');
    }
  }

  private handlePhaseEnd(): void {
    try {
      switch (this.state.round.phase) {
        case 'warmup':
          this.state.round.phase = 'freezetime';
          this.state.round.timeLeft = this.ROUND_TIMES.freezetime;
          break;
        case 'freezetime':
          this.state.round.phase = 'live';
          this.state.round.timeLeft = this.ROUND_TIMES.live;
          break;
        case 'live':
          if (!this.state.round.bombPlanted) {
            this.endRound('ct', 'Time ran out');
          }
          break;
        case 'planted':
          this.endRound('t', 'Bomb detonated');
          break;
        case 'ended':
          this.startNextRound();
          break;
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Error handling phase end:', error);
      toast.error('Error transitioning game phase');
    }
  }

  private endRound(winner: 't' | 'ct', reason: string): void {
    try {
      this.state.round.phase = 'ended';
      this.state.round.winner = winner;
      this.state.round.endReason = reason;
      this.state.match.score[winner]++;
  
      const winningTeam = this.state.teams[winner];
      winningTeam.roundWins++;
      winningTeam.money += 3250;
      
      const losingTeam = this.state.teams[winner === 't' ? 'ct' : 't'];
      losingTeam.money += losingTeam.lossBonus;
      losingTeam.lossBonus = Math.min(losingTeam.lossBonus + 500, 3400);
  
      this.updateMomentum(winner);
      this.notifyListeners();
      toast.success(`Round ended: ${reason}`);
  
      if (this.checkMatchEnd()) {
        this.endMatch();
      } else {
        setTimeout(() => this.startNextRound(), 5000);
      }
    } catch (error) {
      console.error('Error ending round:', error);
      toast.error('Failed to end round properly');
    }
  }

  private checkMatchEnd(): boolean {
    const { t, ct } = this.state.match.score;
    const maxRounds = this.state.match.maxRounds;
    return t > maxRounds / 2 || ct > maxRounds / 2 || this.state.match.currentRound >= maxRounds;
  }

  private endMatch(): void {
    try {
      const { t, ct } = this.state.match.score;
      this.state.match.status = 'ended';
      this.state.match.winner = t > ct ? 't' : 'ct';
      this.state.match.endTime = Date.now();
      this.stopGameLoop();
      
      this.notifyListeners();
      toast.success(`Match ended! Winner: ${this.state.match.winner.toUpperCase()}`);
    } catch (error) {
      console.error('Error ending match:', error);
      toast.error('Failed to end match properly');
    }
  }

  private startNextRound(): void {
    try {
      this.state.match.currentRound++;
      this.state.round = {
        phase: 'freezetime',
        timeLeft: this.ROUND_TIMES.freezetime,
        bombPlanted: false,
        bombSite: null,
        plantTime: null,
        winner: null,
        endReason: null,
        currentStrategy: {
          t: this.state.teams.t.strategy,
          ct: this.state.teams.ct.strategy
        },
        activeCall: null
      };

      ['t', 'ct'].forEach(side => {
        this.state.teams[side as 't' | 'ct'].agents.forEach(agent => {
          agent.isAlive = true;
          agent.health = 100;
          agent.armor = 0;
        });
      });

      this.notifyListeners();
      toast.success(`Round ${this.state.match.currentRound} starting`);
    } catch (error) {
      console.error('Error starting next round:', error);
      toast.error('Failed to start next round');
    }
  }

  public pauseMatch(): void {
    try {
      this.state.match.status = 'paused';
      if (this.gameLoopInterval) {
        clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = null;
      }
      this.notifyListeners();
      toast.info('Match paused');
    } catch (error) {
      console.error('Error pausing match:', error);
      toast.error('Failed to pause match');
    }
  }

  public resumeMatch(): void {
    try {
      this.state.match.status = 'active';
      this.startGameLoop();
      this.notifyListeners();
      toast.success('Match resumed');
    } catch (error) {
      console.error('Error resuming match:', error);
      toast.error('Failed to resume match');
    }
  }

  public stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  private findAgent(id: string): Agent | undefined {
    return [...this.state.teams.t.agents, ...this.state.teams.ct.agents]
      .find(agent => agent.id === id);
  }

  public getState(): GameState {
    return { ...this.state };
  }

  private createDefaultTeam(side: 't' | 'ct'): Team {
    return {
      money: 800,
      roundWins: 0,
      lossBonus: 1400,
      timeoutAvailable: true,
      strategy: 'default',
      agents: Array(5).fill(null).map((_, index) => ({
        id: `${side}-agent-${index}`,
        name: `${side} Agent ${index + 1}`,
        team: side,
        role: 'rifler',
        position: { x: 0, y: 0 },
        isAlive: true,
        health: 100,
        armor: 0,
        weapons: [],
        equipment: [],
        stats: {
          aim: 50 + Math.floor(Math.random() * 50),
          reaction: 50 + Math.floor(Math.random() * 50),
          positioning: 50 + Math.floor(Math.random() * 50),
          utility: 50 + Math.floor(Math.random() * 50),
          leadership: 50 + Math.floor(Math.random() * 50),
          clutch: 50 + Math.floor(Math.random() * 50)
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
      })),
      strategyStats: {
        roundsWonWithStrategy: {},
        strategySuccessRate: 0,
        lastSuccessfulStrategy: ''
      }
    };
  }

  public cleanup(): void {
    if (!this.isBrowser) return;
    
    this.stopGameLoop();
    this.listeners.clear();
    GameController.instance = null;
  }

  // Helper method to safely access teams
  private getTeam(side: 't' | 'ct'): Team {
    return this.state.teams[side];
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };

  // Helper method to safely update team state
  private updateTeam(side: 't' | 'ct', updates: Partial<Team>): void {
    this.state.teams[side] = {
      ...this.state.teams[side],
      ...updates
    };
  }
}