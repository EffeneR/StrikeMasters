// Dust2TacticsSystem.ts
interface Position {
  x: number;
  y: number;
}

interface AgentPositions {
  [role: string]: string[];
}

interface StrategySetup {
  positions: AgentPositions;
  utility?: { [role: string]: string[] };
  priority?: { [key: string]: number };
}

interface TeamStrategies {
  [strategy: string]: StrategySetup;
}

class Dust2TacticsSystem {
  private mapPositions: { [key: string]: Position };
  private strategies: { t_side: TeamStrategies; ct_side: TeamStrategies };
  private midRoundCalls: { [key: string]: StrategySetup };

  constructor() {
    this.initializeMapPositions();
    this.initializeStrategies();
    this.initializeMidRoundCalls();
  }

  public initialize(gameState: any): void {
    console.log('Dust2TacticsSystem initialized');
  }

  private initializeMapPositions(): void {
    this.mapPositions = {
      t_spawn: { x: 60, y: 180 },
      t_mid: { x: 120, y: 150 },
      long_doors: { x: 85, y: 80 },
      upper_tunnels: { x: 80, y: 200 },
      lower_tunnels: { x: 100, y: 220 },
      ct_spawn: { x: 230, y: 170 },
      b_platform: { x: 70, y: 220 },
      window: { x: 150, y: 120 },
      a_site: { x: 220, y: 80 },
      goose: { x: 200, y: 90 },
      car: { x: 240, y: 70 },
      mid_doors: { x: 150, y: 150 },
      catwalk: { x: 180, y: 120 },
      xbox: { x: 130, y: 130 }
    };
  }

  private initializeStrategies(): void {
    this.strategies = {
      t_side: {
        default: {
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
          }
        },
        rush_b: {
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
          priority: { speed: 0.8, utility: 0.2 }
        },
        split_a: {
          positions: {
            'Entry Fragger': ['t_spawn', 'long_doors', 'a_site'],
            'AWPer': ['t_spawn', 'catwalk', 'a_site'],
            'Support': ['t_spawn', 'catwalk', 'a_site'],
            'In-Game Leader': ['t_spawn', 'long_doors', 'a_site'],
            'Lurker': ['t_spawn', 'upper_tunnels']
          },
          utility: {
            'Support': ['smoke', 'smoke', 'flash'],
            'Entry Fragger': ['flash', 'molotov'],
            'In-Game Leader': ['smoke', 'flash']
          },
          priority: { coordination: 0.7, utility: 0.3 }
        },
        mid_control: {
          positions: {
            'Entry Fragger': ['t_spawn', 't_mid', 'catwalk'],
            'AWPer': ['t_spawn', 't_mid', 'mid_doors'],
            'Support': ['t_spawn', 'xbox', 'catwalk'],
            'In-Game Leader': ['t_spawn', 't_mid', 'mid_doors'],
            'Lurker': ['t_spawn', 'lower_tunnels']
          },
          utility: {
            'Support': ['smoke', 'flash'],
            'Entry Fragger': ['flash', 'molotov'],
            'In-Game Leader': ['smoke', 'flash']
          }
        }
      },
      ct_side: {
        default: {
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
          }
        },
        stack_b: {
          positions: {
            'Entry Fragger': ['ct_spawn', 'b_platform'],
            'AWPer': ['ct_spawn', 'window'],
            'Support': ['ct_spawn', 'b_platform'],
            'In-Game Leader': ['ct_spawn', 'b_platform'],
            'Lurker': ['ct_spawn', 'mid_doors']
          },
          utility: {
            'Support': ['smoke', 'flash'],
            'Entry Fragger': ['molotov'],
            'In-Game Leader': ['smoke', 'flash']
          }
        },
        retake_setup: {
          positions: {
            'Entry Fragger': ['ct_spawn', 'car'],
            'AWPer': ['ct_spawn', 'mid_doors'],
            'Support': ['ct_spawn', 'window'],
            'In-Game Leader': ['ct_spawn', 'goose'],
            'Lurker': ['ct_spawn', 'b_platform']
          },
          utility: {
            'Support': ['smoke', 'flash', 'flash'],
            'Entry Fragger': ['flash', 'molotov'],
            'In-Game Leader': ['smoke', 'flash']
          }
        }
      }
    };
  }

  private initializeMidRoundCalls(): void {
    this.midRoundCalls = {
      rotate_a: {
        positions: {
          'Entry Fragger': ['a_site'],
          'AWPer': ['long_doors'],
          'Support': ['catwalk'],
          'In-Game Leader': ['a_site'],
          'Lurker': ['mid_doors']
        }
      },
      rotate_b: {
        positions: {
          'Entry Fragger': ['b_platform'],
          'AWPer': ['window'],
          'Support': ['b_platform'],
          'In-Game Leader': ['b_platform'],
          'Lurker': ['upper_tunnels']
        }
      },
      hold_positions: {
        positions: {
          'Entry Fragger': ['current'],
          'AWPer': ['current'],
          'Support': ['current'],
          'In-Game Leader': ['current'],
          'Lurker': ['current']
        }
      }
    };
  }

  getPositionForAgent(agent: any, phase: string, strategy: string): Position {
    const side = agent.team;
    const sideKey = `${side}_side` as 't_side' | 'ct_side';
    
    // Get strategy positions
    const currentStrategy = this.strategies[sideKey]?.[strategy || 'default'];
    if (!currentStrategy) return this.getDefaultPosition(agent);

    const positions = currentStrategy.positions[agent.role];
    if (!positions) return this.getDefaultPosition(agent);

    const positionIndex = this.getPhasePositionIndex(phase);
    const positionName = positions[Math.min(positionIndex, positions.length - 1)];
    return this.mapPositions[positionName] || this.getDefaultPosition(agent);
  }

  getPositionForRotate(agent: any, site: 'A' | 'B'): Position {
    const call = site === 'A' ? 'rotate_a' : 'rotate_b';
    const positions = this.midRoundCalls[call]?.positions[agent.role];
    if (!positions || positions[0] === 'current') return agent.position;
    return this.mapPositions[positions[0]] || this.getDefaultPosition(agent);
  }

  getPositionForExecute(agent: any, site: 'A' | 'B'): Position {
    const targetPosition = site === 'A' ? 'a_site' : 'b_platform';
    return this.mapPositions[targetPosition] || this.getDefaultPosition(agent);
  }

  getPositionForFallback(agent: any): Position {
    return this.getSpawnPosition(agent.team);
  }

  private getPhasePositionIndex(phase: string): number {
    switch (phase) {
      case 'freezetime': return 0;
      case 'live': return 1;
      case 'planted': return 2;
      case 'ended': return 0;
      default: return 0;
    }
  }

  getDefaultPosition(agent: any): Position {
    return this.mapPositions[agent.team === 't' ? 't_spawn' : 'ct_spawn'];
  }

  getSpawnPosition(side: string): Position {
    return this.mapPositions[side === 't' ? 't_spawn' : 'ct_spawn'];
  }

  getUtilityForPosition(agent: any, position: string): string[] {
    const side = `${agent.team}_side` as 't_side' | 'ct_side';
    const strategy = this.strategies[side]?.[agent.strategy || 'default'];
    return strategy?.utility?.[agent.role] || [];
  }

  getAvailableStrategies(side: 't' | 'ct'): string[] {
    return Object.keys(this.strategies[`${side}_side`]);
  }

  getAvailableMidRoundCalls(): string[] {
    return Object.keys(this.midRoundCalls);
  }

  validateStrategy(side: 't' | 'ct', strategy: string): boolean {
    return !!this.strategies[`${side}_side`][strategy];
  }

  getStrategyPriority(side: 't' | 'ct', strategy: string): Record<string, number> {
    return this.strategies[`${side}_side`][strategy]?.priority || {};
  }
}

export default Dust2TacticsSystem;