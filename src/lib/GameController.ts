// GameController.ts
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
  team: 't' | 'ct';
  role: string;
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
  combatResult: any | null;
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

interface GameEvent {
  type: string;
  data: any;
  timestamp: number;
}

type StateListener = (state: GameState) => void;

export default class GameController {
  private state: GameState;
  private listeners: StateListener[] = [];
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

    // Initialize with default state including score
    this.state = {
      match: {
        id: '',
        status: 'pending',
        currentRound: 0,
        maxRounds: 30,
        score: { t: 0, ct: 0 }, // Ensure score is initialized
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
          t: 'Default',
          ct: 'Default'
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

    // Initialize all systems with default state
    Object.values(this.systems).forEach(system => system.initialize(this.state));
  }

  private createDefaultTeam(): Team {
    return {
      money: 800,
      roundWins: 0,
      lossBonus: 1400,
      timeoutAvailable: true,
      strategy: 'Default',
      agents: [],
      strategyStats: {
        roundsWonWithStrategy: {},
        strategySuccessRate: 0,
        lastSuccessfulStrategy: ''
      }
    };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  public initializeMatch(config: {
    playerTeam: Agent[];
    botTeam: Agent[];
    config: {
      maxRounds: number;
      startingSide: 't' | 'ct';
      initialStrategy: string;
      difficulty: string;
      matchId: string;
    };
  }): void {
    console.log("Initializing match with config:", config);

    // Create a complete state object atomically
    const newState: GameState = {
      match: {
        id: config.config.matchId,
        status: 'active',
        currentRound: 1,
        maxRounds: config.config.maxRounds,
        score: { t: 0, ct: 0 },
        winner: null,
        startTime: Date.now(),
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
          t: config.config.initialStrategy,
          ct: 'Default'
        },
        activeCall: null
      },
      teams: {
        t: {
          money: 800,
          roundWins: 0,
          lossBonus: 1400,
          timeoutAvailable: true,
          strategy: config.config.startingSide === 't' ? config.config.initialStrategy : 'Default',
          agents: config.config.startingSide === 't' ? config.playerTeam : config.botTeam,
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
          strategy: config.config.startingSide === 'ct' ? config.config.initialStrategy : 'Default',
          agents: config.config.startingSide === 'ct' ? config.playerTeam : config.botTeam,
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

    // Assign new state atomically
    this.state = newState;

    // Initialize all systems with new state
    Object.values(this.systems).forEach(system => system.initialize(this.state));

    // Start game loop
    this.startGameLoop();
    
    // Notify listeners of state change
    this.notifyListeners();
  }

  public startGameLoop(): void {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    
    this.state.match.status = 'active';
    this.state.round.phase = 'freezetime';
    this.state.round.timeLeft = 15;
    
    this.gameLoopInterval = setInterval(() => this.update(1000/60), 1000/60);
    this.notifyListeners();
  }

  private update(deltaTime: number): void {
    if (this.state.match.status !== 'active') return;

    switch (this.state.round.phase) {
      case 'warmup': this.handleWarmupPhase(); break;
      case 'freezetime': this.handleFreezeTimePhase(); break;
      case 'live': this.handleLivePhase(deltaTime); break;
      case 'planted': this.handlePlantedPhase(); break;
      case 'ended': this.handleEndedPhase(); break;
    }

    this.notifyListeners();
  }

  private handleWarmupPhase(): void {
    if (this.state.round.timeLeft <= 0) {
      this.state.round.phase = 'freezetime';
      this.state.round.timeLeft = 15;
      this.notifyListeners();
    }
  }

  private handleFreezeTimePhase(): void {
    if (this.state.round.timeLeft <= 0) {
      this.state.round.phase = 'live';
      this.state.round.timeLeft = 115;
      this.notifyListeners();
    }
  }

  private handleLivePhase(deltaTime: number): void {
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
        { t: this.state.teams.t.strategy, ct: this.state.teams.ct.strategy }
      );

      if (combatResults.length > 0) {
        this.processCombatResults(combatResults);
        this.checkRoundEnd();
      }

      this.lastCombatProcess = now;
    }

    if (this.state.round.timeLeft <= 0) {
      this.endRound('ct', 'Time ran out');
    }
  }

  private handlePlantedPhase(): void {
    if (this.state.round.timeLeft <= 0) {
      this.endRound('t', 'Bomb detonated');
    }
  }

  private handleEndedPhase(): void {
    if (this.shouldEndMatch()) {
      this.endMatch();
    } else {
      this.startNextRound();
    }
  }

  private processCombatResults(results: any[]): void {
    results.forEach(result => {
      if (result.type === 'kill') {
        const killer = this.findAgent(result.killerId);
        const victim = this.findAgent(result.victimId);
        
        if (killer && victim) {
          killer.matchStats.kills++;
          victim.matchStats.deaths++;
          victim.isAlive = false;
          
          this.state.events.push({
            type: 'kill',
            data: {
              killer: killer.name,
              victim: victim.name,
              weapon: result.weapon
            },
            timestamp: Date.now()
          });
        }
      }
    });

    this.state.combatResult = results[results.length - 1];
  }

  private checkRoundEnd(): void {
    const tAliveCount = this.state.teams.t.agents.filter(a => a.isAlive).length;
    const ctAliveCount = this.state.teams.ct.agents.filter(a => a.isAlive).length;

    if (tAliveCount === 0) {
      this.endRound('ct', 'All terrorists eliminated');
    } else if (ctAliveCount === 0) {
      this.endRound('t', 'All counter-terrorists eliminated');
    }
  }

  public handlePhaseEnd(): void {
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
    this.notifyListeners();
  }

  public updateTimer(): void {
    if (this.state.round.timeLeft > 0) {
      this.state.round.timeLeft--;
      if (this.state.round.timeLeft === 0) {
        this.handlePhaseEnd();
      }
      this.notifyListeners();
    }
  }

  private endRound(winner: 't' | 'ct', reason: string): void {
    this.state.round.phase = 'ended';
    this.state.round.winner = winner;
    this.state.round.endReason = reason;
    this.state.match.score[winner]++;

    const winningTeam = this.state.teams[winner];
    winningTeam.roundWins++;
    
    const strategy = winningTeam.strategy;
    winningTeam.strategyStats.roundsWonWithStrategy[strategy] = 
      (winningTeam.strategyStats.roundsWonWithStrategy[strategy] || 0) + 1;
    winningTeam.strategyStats.lastSuccessfulStrategy = strategy;
    
    const totalRoundsWithStrategy = Object.values(winningTeam.strategyStats.roundsWonWithStrategy)
      .reduce((a, b) => a + b, 0);
    winningTeam.strategyStats.strategySuccessRate = 
      (winningTeam.strategyStats.roundsWonWithStrategy[strategy] || 0) / totalRoundsWithStrategy;

    this.updateEconomy(winner);
    this.notifyListeners();
  }

  private updateEconomy(roundWinner: 't' | 'ct'): void {
    const loser = roundWinner === 't' ? 'ct' : 't';
    
    this.state.teams[roundWinner].money += 3250;
    this.state.teams[loser].money += this.state.teams[loser].lossBonus;
    this.state.teams[loser].lossBonus = Math.min(3400, this.state.teams[loser].lossBonus + 500);
    this.state.teams[roundWinner].lossBonus = 1400;
  }

  private startNextRound(): void {
    if (this.shouldEndMatch()) {
      this.endMatch();
      return;
    }

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

    ['t', 'ct'].forEach(side => {
      this.state.teams[side as 't' | 'ct'].agents.forEach(agent => {
        agent.isAlive = true;
        agent.health = 100;
        agent.armor = 0;
      });
    });

    this.notifyListeners();
  }

  private shouldEndMatch(): boolean {
    const { score, maxRounds } = this.state.match;
    const roundsNeededToWin = Math.floor(maxRounds / 2) + 1;
    return score.t >= roundsNeededToWin || 
           score.ct >= roundsNeededToWin || 
           this.state.match.currentRound >= maxRounds;
  }

  private endMatch(): void {
    this.state.match.status = 'ended';
    this.state.match.endTime = Date.now();
    
    if (this.state.match.score.t > this.state.match.score.ct) {
      this.state.match.winner = 't';
    } else if (this.state.match.score.ct > this.state.match.score.t) {
      this.state.match.winner = 'ct';
    }
    
    this.stopGameLoop();
    this.notifyListeners();
  }

  public updateStrategy(side: 't' | 'ct', strategy: string): void {
    this.state.teams[side].strategy = strategy;
    this.state.round.currentStrategy[side] = strategy;
    this.notifyListeners();
  }

  public processMidRoundCall(side: 't' | 'ct', call: string): void {
    this.state.round.activeCall = call;
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

  private findAgent(id: string): Agent | undefined {
    return [...this.state.teams.t.agents, ...this.state.teams.ct.agents]
      .find(agent => agent.id === id);
  }

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

  public getState(): GameState {
    return this.state;
  }

  public clearCombatResult(): void {
    this.state.combatResult = null;
    this.notifyListeners();
  }
}