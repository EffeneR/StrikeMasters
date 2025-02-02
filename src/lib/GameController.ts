// src/lib/GameController.ts
import RoundSystem from './systems/RoundSystem';
import CombatSystem from './systems/CombatSystem';
import MovementSystem from './systems/MovementSystem';
import BuySystem from './systems/BuySystem';
import Dust2TacticsSystem from './systems/Dust2TacticsSystem';
import AgentSystem from './systems/AgentSystem';

// Strategy Definitions
export const T_STRATEGIES = {
  DEFAULT: "Default",
  RUSH_B: "Rush B",
  SPLIT_A: "Split A",
  MID_CONTROL: "Mid Control",
  FAKE_A_B: "Fake A to B",
  ECO_RUSH: "Eco Rush"
} as const;

export const CT_STRATEGIES = {
  DEFAULT: "Default",
  AGGRO_MID: "Aggressive Mid",
  STACK_A: "Stack A",
  STACK_B: "Stack B",
  RETAKE_SETUP: "Retake Setup",
  FULL_SAVE: "Full Save"
} as const;

export type TStrategy = keyof typeof T_STRATEGIES;
export type CTStrategy = keyof typeof CT_STRATEGIES;

export interface Position {
  x: number;
  y: number;
}

export interface StrategyConfig {
  name: string;
  positions: {[role: string]: string[]};
  utility: {[role: string]: string[]};
  priority: {
    aggression: number;
    map_control: number;
    economy: number;
  };
}

export interface MidRoundCall {
  type: 'rotate' | 'execute' | 'fallback' | 'hold';
  target?: 'A' | 'B' | 'Mid';
  priority: number;
}

export interface GameState {
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
    activeCall: MidRoundCall | null;
  };
  teams: {
    t: Team;
    ct: Team;
  };
  events: Event[];
  combatResult: CombatResult | null;
}

export interface Team {
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

export interface Agent {
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

export interface Event {
  type: string;
  timestamp: number;
  data: any;
}

export interface CombatResult {
  type: 'kill' | 'damage' | 'utility' | 'trade';
  attacker: Agent;
  victim?: Agent;
  weapon?: string;
  damage?: number;
  isHeadshot?: boolean;
  isStrategyKill?: boolean;
  isTradeKill?: boolean;
  position?: Position;
}
// GameController.ts (continued...)

export class GameController {
  private state: GameState;
  private systems: {
    round: RoundSystem;
    combat: CombatSystem;
    movement: MovementSystem;
    buy: BuySystem;
    tactics: Dust2TacticsSystem;
    agent: AgentSystem;
  };
  private listeners: Set<(state: GameState) => void>;
  private lastUpdate: number;
  private lastCombatProcess: number;
  private gameLoopInterval: NodeJS.Timeout | null;
  private strategyTimeout: NodeJS.Timeout | null;
  private activeStrategies: Map<string, StrategyConfig>;
  private currentCall: MidRoundCall | null;

  constructor() {
    const tactics = new Dust2TacticsSystem();
    
    this.systems = {
      round: new RoundSystem(),
      combat: new CombatSystem(),
      movement: new MovementSystem(tactics),
      buy: new BuySystem(),
      tactics: tactics,
      agent: new AgentSystem()
    };

    this.state = this.getInitialState();
    this.listeners = new Set();
    this.lastUpdate = Date.now();
    this.lastCombatProcess = 0;
    this.gameLoopInterval = null;
    this.strategyTimeout = null;
    this.currentCall = null;
    this.activeStrategies = new Map();

    this.initializeStrategies();
  }

  private getInitialState(): GameState {
    return {
      match: {
        id: Math.random().toString(36).substr(2, 9),
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
        timeLeft: 0,
        bombPlanted: false,
        bombSite: null,
        plantTime: null,
        winner: null,
        endReason: null,
        currentStrategy: {
          t: T_STRATEGIES.DEFAULT,
          ct: CT_STRATEGIES.DEFAULT
        },
        activeCall: null
      },
      teams: {
        t: this.createInitialTeam(),
        ct: this.createInitialTeam()
      },
      events: [],
      combatResult: null
    };
  }

  private createInitialTeam(): Team {
    return {
      money: 800,
      roundWins: 0,
      lossBonus: 0,
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

  public initializeMatch(config: { 
    playerTeam: Agent[],
    botTeam: Agent[],
    config: {
      maxRounds: number,
      startingSide: 't' | 'ct',
      initialStrategy: string,
      difficulty: string
    }
  }): void {
    const { playerTeam, botTeam, config: matchConfig } = config;
    
    this.state.match.maxRounds = matchConfig.maxRounds;
    this.state.match.status = 'active';
    this.state.match.startTime = Date.now();

    const side = matchConfig.startingSide;
    this.state.teams[side].agents = playerTeam;
    this.state.teams[side === 't' ? 'ct' : 't'].agents = botTeam;

    this.state.round.currentStrategy[side] = matchConfig.initialStrategy;
    
    this.startGameLoop();
  }
  // GameController.ts (continued...)

  public stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }
  
  public pauseMatch(): void {
    this.state.match.status = 'paused';
    this.stopGameLoop();
    this.notifyListeners();
  }
  
  public resumeMatch(): void {
    this.state.match.status = 'active';
    this.startGameLoop();
    this.notifyListeners();
  }
  
  public buyItem(agentId: string, loadout: any): void {
    // Find agent
    const agent = [...this.state.teams.t.agents, ...this.state.teams.ct.agents]
      .find(a => a.id === agentId);
    if (!agent) return;
  
    // Update agent's weapons and equipment
    agent.weapons = loadout.weapons;
    agent.equipment = loadout.equipment;
  
    this.notifyListeners();
  }
  
  public setState(initialState: Partial<GameState>): void {
    this.state = { ...this.state, ...initialState };
    this.notifyListeners();
  }
  
  public clearCombatResult(): void {
    this.state.combatResult = null;
    this.notifyListeners();
  }

  public handlePhaseEnd(): void {
    const currentPhase = this.state.round.phase;
    
    switch (currentPhase) {
      case 'warmup':
        this.state.round.phase = 'freezetime';
        this.state.round.timeLeft = 15; // Freeze time duration
        break;
      case 'freezetime':
        this.state.round.phase = 'live';
        this.state.round.timeLeft = 115; // Round time
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
        // Start next round
        this.state.match.currentRound++;
        this.state.round.phase = 'freezetime';
        this.state.round.timeLeft = 15;
        break;
    }
    this.notifyListeners();
  }
  
  public updateTimer(): void {
    if (this.state.round.timeLeft > 0) {
      this.state.round.timeLeft--;
      
      if (this.state.round.timeLeft === 0) {
        this.handlePhaseEnd();
      }
    }
    this.notifyListeners();
  }
  
  public startGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    
    this.state.match.status = 'active';
    this.state.round.phase = 'freezetime';
    this.state.round.timeLeft = 15;
    
    this.gameLoopInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
    
    this.notifyListeners();
  }

  private initializeStrategies(): void {
    // T-side strategies
    this.activeStrategies.set('t_default', {
      name: T_STRATEGIES.DEFAULT,
      positions: {
        'Entry Fragger': ['t_spawn', 'long_doors'],
        'AWPer': ['t_spawn', 't_mid'],
        'Support': ['t_spawn', 'upper_tunnels'],
        'In-Game Leader': ['t_spawn', 'catwalk'],
        'Lurker': ['t_spawn', 'lower_tunnels']
      },
      utility: {
        'Support': ['smoke', 'flash'],
        'Entry Fragger': ['flash', 'flash'],
        'In-Game Leader': ['smoke', 'molotov']
      },
      priority: {
        aggression: 0.5,
        map_control: 0.5,
        economy: 0.5
      }
    });

    this.activeStrategies.set('t_rush_b', {
      name: T_STRATEGIES.RUSH_B,
      positions: {
        'Entry Fragger': ['t_spawn', 'upper_tunnels', 'b_platform'],
        'AWPer': ['t_spawn', 'upper_tunnels', 'b_platform'],
        'Support': ['t_spawn', 'upper_tunnels', 'b_platform'],
        'In-Game Leader': ['t_spawn', 'upper_tunnels', 'b_platform'],
        'Lurker': ['t_spawn', 'mid_doors']
      },
      utility: {
        'Support': ['smoke', 'flash', 'flash'],
        'Entry Fragger': ['flash', 'flash'],
        'In-Game Leader': ['molotov']
      },
      priority: {
        aggression: 0.8,
        map_control: 0.3,
        economy: 0.4
      }
    });

    // CT-side strategies
    this.activeStrategies.set('ct_default', {
      name: CT_STRATEGIES.DEFAULT,
      positions: {
        'Entry Fragger': ['ct_spawn', 'long_doors'],
        'AWPer': ['ct_spawn', 'mid_doors'],
        'Support': ['ct_spawn', 'b_platform'],
        'In-Game Leader': ['ct_spawn', 'a_site'],
        'Lurker': ['ct_spawn', 'window']
      },
      utility: {
        'Support': ['smoke', 'flash'],
        'Entry Fragger': ['flash', 'flash'],
        'In-Game Leader': ['smoke', 'molotov']
      },
      priority: {
        aggression: 0.5,
        map_control: 0.6,
        economy: 0.5
      }
    });
  }

  public updateStrategy(side: 't' | 'ct', strategyName: string): void {
    if (this.state.round.phase !== 'freezetime') return;

    const strategyKey = `${side}_${strategyName.toLowerCase()}`;
    const strategy = this.activeStrategies.get(strategyKey);

    if (!strategy) {
      console.error(`Invalid strategy: ${strategyName}`);
      return;
    }

    this.state.round.currentStrategy[side] = strategyName;
    this.state.teams[side].strategy = strategyName;

    // Update agent positions based on new strategy
    this.state.teams[side].agents.forEach(agent => {
      agent.position = this.systems.tactics.getPositionForAgent(
        agent,
        this.state.round.phase,
        strategyName
      );
    });

    // Add utility based on strategy
    this.state.teams[side].agents.forEach(agent => {
      const utility = strategy.utility[agent.role] || [];
      agent.equipment = [...new Set([...agent.equipment, ...utility])];
    });

    this.addEvent({
      type: 'strategy_change',
      timestamp: Date.now(),
      data: {
        side,
        strategy: strategyName,
        round: this.state.match.currentRound
      }
    });

    this.notifyListeners();
  }

  public processMidRoundCall(side: 't' | 'ct', callType: string, target?: string): void {
    if (this.state.round.phase !== 'live') return;

    const call: MidRoundCall = {
      type: callType as 'rotate' | 'execute' | 'fallback' | 'hold',
      target: target as 'A' | 'B' | 'Mid',
      priority: 1
    };

    this.currentCall = call;
    this.state.round.activeCall = call;
    this.updateAgentPositionsForCall(side, call);

    this.addEvent({
      type: 'mid_round_call',
      timestamp: Date.now(),
      data: {
        side,
        call: callType,
        target,
        round: this.state.match.currentRound
      }
    });

    if (this.strategyTimeout) {
      clearTimeout(this.strategyTimeout);
    }

    this.strategyTimeout = setTimeout(() => {
      this.currentCall = null;
      this.state.round.activeCall = null;
      this.notifyListeners();
    }, 10000);

    this.notifyListeners();
  }
  // GameController.ts (continued...)

  private updateAgentPositionsForCall(side: 't' | 'ct', call: MidRoundCall): void {
    const team = this.state.teams[side];
    team.agents.forEach(agent => {
      if (!agent.isAlive) return;

      switch (call.type) {
        case 'rotate':
          agent.position = this.systems.tactics.getPositionForRotate(agent, call.target);
          break;
        case 'execute':
          agent.position = this.systems.tactics.getPositionForExecute(agent, call.target);
          break;
        case 'fallback':
          agent.position = this.systems.tactics.getPositionForFallback(agent);
          break;
        case 'hold':
          // Maintain current position
          break;
      }
    });
  }

  private startGameLoop(): void {
    this.gameLoopInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - this.lastUpdate) / 1000;
      this.update(deltaTime);
      this.lastUpdate = now;
    }, 1000 / 60); // 60 FPS
  }

  private update(deltaTime: number): void {
    if (this.state.match.status !== 'active' || this.state.round.phase !== 'live') return;

    // Update positions considering strategy and calls
    ['t', 'ct'].forEach(side => {
      const team = this.state.teams[side as 't' | 'ct'];
      this.systems.movement.updatePositions(
        team.agents,
        this.state.round.phase,
        deltaTime,
        team.strategy,
        this.currentCall
      );
    });

    // Process combat with strategy consideration
    const now = Date.now();
    if (now - this.lastCombatProcess >= 500) {  // Process combat every 500ms
      const combatResults = this.systems.combat.processCombatRound(
        [...this.state.teams.t.agents, ...this.state.teams.ct.agents],
        this.state,
        {
          t: this.state.teams.t.strategy,
          ct: this.state.teams.ct.strategy
        }
      );

      if (combatResults.length > 0) {
        this.processCombatResults(combatResults);
        this.checkRoundEnd();
      }

      this.lastCombatProcess = now;
    }

    this.notifyListeners();
  }

  private processCombatResults(results: CombatResult[]): void {
    results.forEach(result => {
      this.state.combatResult = result;
      this.addEvent({
        type: 'combat',
        timestamp: Date.now(),
        data: {
          ...result,
          round: this.state.match.currentRound
        }
      });
    });
  }

  private checkRoundEnd(): void {
    // Count alive players
    const aliveCT = this.state.teams.ct.agents.filter(agent => agent.isAlive).length;
    const aliveT = this.state.teams.t.agents.filter(agent => agent.isAlive).length;

    // Check win conditions
    if (this.state.round.bombPlanted) {
      if (aliveCT === 0) {
        this.endRound('t', 'All CT eliminated');
      } else if (aliveT === 0) {
        this.endRound('ct', 'All T eliminated and bomb defused');
      }
    } else {
      if (aliveCT === 0) {
        this.endRound('t', 'All CT eliminated');
      } else if (aliveT === 0) {
        this.endRound('ct', 'All T eliminated');
      }
    }
  }

  private endRound(winner: 't' | 'ct', reason: string): void {
    this.state.round.winner = winner;
    this.state.round.endReason = reason;
    this.state.round.phase = 'ended';
    this.state.match.score[winner]++;

    this.calculateRoundEndRewards(winner);
    this.updateStrategyStats(winner);

    if (this.checkMatchEnd()) {
      this.endMatch();
    }

    this.notifyListeners();
  }

  private calculateRoundEndRewards(winner: 't' | 'ct'): void {
    const loser = winner === 't' ? 'ct' : 't';
    
    const winReward = 3250;
    this.state.teams[winner].money = Math.min(16000, 
      this.state.teams[winner].money + winReward
    );

    const lossReward = 1400 + (this.state.teams[loser].lossBonus * 500);
    this.state.teams[loser].money = Math.min(16000, 
      this.state.teams[loser].money + lossReward
    );

    // Update loss bonus
    this.state.teams[loser].lossBonus = Math.min(4, this.state.teams[loser].lossBonus + 1);
    this.state.teams[winner].lossBonus = 0;
  }

  private updateStrategyStats(winner: 't' | 'ct'): void {
    const winningTeam = this.state.teams[winner];
    const strategy = winningTeam.strategy;
    winningTeam.strategyStats.roundsWonWithStrategy[strategy] = 
      (winningTeam.strategyStats.roundsWonWithStrategy[strategy] || 0) + 1;
    
    const totalRoundsWithStrategy = this.state.match.currentRound;
    winningTeam.strategyStats.strategySuccessRate = 
      winningTeam.strategyStats.roundsWonWithStrategy[strategy] / totalRoundsWithStrategy;
    
    winningTeam.strategyStats.lastSuccessfulStrategy = strategy;
  }

  private checkMatchEnd(): boolean {
    const { maxRounds, score } = this.state.match;
    const halfRounds = maxRounds / 2;
    
    return (
      score.t > halfRounds ||
      score.ct > halfRounds ||
      this.state.match.currentRound >= maxRounds
    );
  }

  private endMatch(): void {
    this.state.match.status = 'ended';
    this.state.match.endTime = Date.now();
    this.state.match.winner = 
      this.state.match.score.t > this.state.match.score.ct ? 't' : 'ct';

    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  private addEvent(event: Omit<Event, "timestamp">): void {
    this.state.events.push({
      ...event,
      timestamp: Date.now()
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): GameState {
    return this.state;
  }
}

export default GameController;