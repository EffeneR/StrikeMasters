import CombatSystem from '@/lib/systems/CombatSystem';
import MovementSystem from '@/lib/systems/MovementSystem';
import RoundSystem from '@/lib/systems/RoundSystem';
import BuySystem from '@/lib/systems/BuySystem';
import AgentSystem from '@/lib/systems/AgentSystem';
import Dust2TacticsSystem from '@/lib/systems/Dust2TacticsSystem';

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

  constructor() {
    this.systems = {
      combat: new CombatSystem(),
      movement: new MovementSystem(),
      round: new RoundSystem(),
      buy: new BuySystem(),
      agent: new AgentSystem(),
      tactics: new Dust2TacticsSystem()
    };

    this.state = {
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

  public setState(newState: GameState): void {
    this.state = newState;
    this.notifyListeners();
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
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
    this.state.match.id = config.config.matchId;
    this.state.match.status = 'active';
    this.state.match.currentRound = 1;
    this.state.match.maxRounds = config.config.maxRounds;
    this.state.match.startTime = Date.now();

    this.state.teams[config.config.startingSide].agents = config.playerTeam;
    this.state.teams[config.config.startingSide === 't' ? 'ct' : 't'].agents = config.botTeam;

    Object.values(this.systems).forEach(system => system.initialize(this.state));
    this.notifyListeners();
  }

  public startGameLoop(): void {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    this.gameLoopInterval = setInterval(() => this.update(1000/60), 1000/60);
  }

  private update(deltaTime: number): void {
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
      }

      this.lastCombatProcess = now;
    }

    this.notifyListeners();
  }

  public updateStrategy(side: 't' | 'ct', strategy: string): void {
    this.state.teams[side].strategy = strategy;
    this.state.round.currentStrategy[side] = strategy;
    this.notifyListeners();
  }

  public processBuy(side: 't' | 'ct', agentId: string, loadout: {
    weapons: string[];
    equipment: string[];
    total: number;
  }): void {
    const agent = this.findAgent(agentId);
    if (!agent || this.state.teams[side].money < loadout.total) return;

    agent.weapons = loadout.weapons;
    agent.equipment = loadout.equipment;
    this.state.teams[side].money -= loadout.total;
    
    this.notifyListeners();
  }

  public makeMidRoundCall(side: 't' | 'ct', call: string): void {
    this.state.round.activeCall = call;
    this.notifyListeners();
  }

  private findAgent(id: string): Agent | undefined {
    return [...this.state.teams.t.agents, ...this.state.teams.ct.agents]
      .find(agent => agent.id === id);
  }

  private handlePhaseEnd(): void {
    switch (this.state.round.phase) {
      case 'warmup':
        this.state.round.phase = 'freezetime';
        this.state.round.timeLeft = 15;
        break;
      case 'freezetime':
        this.state.round.phase = 'live';
        this.state.round.timeLeft = 115;
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
  }

  private endRound(winner: 't' | 'ct', reason: string): void {
    this.state.round.phase = 'ended';
    this.state.round.winner = winner;
    this.state.round.endReason = reason;
    this.state.match.score[winner]++;
    this.notifyListeners();
  }

  private startNextRound(): void {
    this.state.match.currentRound++;
    this.state.round = {
      phase: 'freezetime',
      timeLeft: 15,
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
    this.notifyListeners();
  }

  public pauseMatch(): void {
    this.state.match.status = 'paused';
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.notifyListeners();
  }

  public resumeMatch(): void {
    this.state.match.status = 'active';
    this.startGameLoop();
    this.notifyListeners();
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
    return this.state;
  }
}