// src/lib/GameController.ts

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
  events: GameEvent[];
  combatResult: CombatResult | null;
}

export default class GameController {
  private state: GameState;
  private listeners: ((state: GameState) => void)[] = [];
  private gameLoopInterval: NodeJS.Timer | null = null;
  private lastCombatProcess: number = 0;
  private systems: {
    combat: CombatSystem;
    movement: MovementSystem;
    round: RoundSystem;
    buy: BuySystem;
    agent: AgentSystem;
    tactics: Dust2TacticsSystem;
  };

  private readonly ROUND_TIMES = {
    freezetime: 15,
    live: 115,
    planted: 40
  };

  constructor() {
    try {
      this.systems = {
        combat: new CombatSystem(),
        movement: new MovementSystem(),
        round: new RoundSystem(),
        buy: new BuySystem(),
        agent: new AgentSystem(),
        tactics: new Dust2TacticsSystem()
      };

      this.state = this.createInitialState();
    } catch (error) {
      console.error('Error initializing GameController:', error);
      toast.error('Failed to initialize game systems');
      throw error;
    }
  }

  private createInitialState(): GameState {
    return {
      match: {
        id: '',
        status: 'pending',
        currentRound: 0,
        maxRounds: 30,
        score: { t: 0, ct: 0 },
        winner: null,
        startTime: null,
        endTime: null
      },
      round: {
        phase: 'warmup',
        timeLeft: 0,
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
        t: this.createDefaultTeam(),
        ct: this.createDefaultTeam()
      },
      events: [],
      combatResult: null
    };
  }

  private createDefaultTeam(): Team {
    return {
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
    };
  }

  public setState(newState: Partial<GameState>): void {
    try {
      this.state = { ...this.state, ...newState };
      this.notifyListeners();
    } catch (error) {
      console.error('Error setting game state:', error);
      toast.error('Failed to update game state');
    }
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    try {
      this.listeners.forEach(listener => listener({ ...this.state }));
    } catch (error) {
      console.error('Error notifying listeners:', error);
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

      if (this.state.round.timeLeft > 0) {
        this.state.round.timeLeft -= deltaTime / 1000;
        if (this.state.round.timeLeft <= 0) {
          this.handlePhaseEnd();
        }
      }

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

      this.notifyListeners();
    } catch (error) {
      console.error('Error in game update loop:', error);
      this.pauseMatch();
      toast.error('Game loop error detected');
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

  public updateStrategy(side: 't' | 'ct', strategy: string): void {
    try {
      this.state.teams[side].strategy = strategy;
      this.state.round.currentStrategy[side] = strategy;
      this.notifyListeners();
      toast.success(`Strategy updated for ${side.toUpperCase()} team`);
    } catch (error) {
      console.error('Error updating strategy:', error);
      toast.error('Failed to update strategy');
    }
  }

  public processBuy(side: 't' | 'ct', agentId: string, loadout: {
    weapons: string[];
    equipment: string[];
    total: number;
  }): void {
    try {
      const agent = this.findAgent(agentId);
      if (!agent || this.state.teams[side].money < loadout.total) {
        toast.error('Invalid buy request');
        return;
      }

      agent.weapons = loadout.weapons;
      agent.equipment = loadout.equipment;
      this.state.teams[side].money -= loadout.total;
      
      this.notifyListeners();
      toast.success('Purchase successful');
    } catch (error) {
      console.error('Error processing buy:', error);
      toast.error('Failed to process purchase');
    }
  }

  public makeMidRoundCall(side: 't' | 'ct', call: string): void {
    try {
      this.state.round.activeCall = call;
      this.notifyListeners();
      toast.success(`Mid-round call: ${call}`);
    } catch (error) {
      console.error('Error making mid-round call:', error);
      toast.error('Failed to make mid-round call');
    }
  }

  private findAgent(id: string): Agent | undefined {
    return [...this.state.teams.t.agents, ...this.state.teams.ct.agents]
      .find(agent => agent.id === id);
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

      // Update team statistics
      const winningTeam = this.state.teams[winner];
      winningTeam.roundWins++;
      winningTeam.money += 3250; // Win bonus
      
      const losingTeam = this.state.teams[winner === 't' ? 'ct' : 't'];
      losingTeam.money += losingTeam.lossBonus;
      losingTeam.lossBonus = Math.min(losingTeam.lossBonus + 500, 3400);

      this.notifyListeners();
      toast.success(`Round ended: ${reason}`);

      if (this.checkMatchEnd()) {
        this.endMatch();
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

      // Reset agents for next round
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

  public clearCombatResult(): void {
    this.state.combatResult = null;
    this.notifyListeners();
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public updateTimer(): void {
    try {
      if (this.state.match.status !== 'active') return;

      if (this.state.round.timeLeft > 0) {
        this.state.round.timeLeft -= 1; // Decrease by 1 second
        
        // Check if time has run out
        if (this.state.round.timeLeft <= 0) {
          this.handlePhaseEnd();
        }
        
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error updating timer:', error);
      toast.error('Failed to update timer');
    }
  }
}