// AgentSystem.ts
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

interface MatchStats {
  kills: number;
  deaths: number;
  assists: number;
  utilityDamage: number;
  flashAssists: number;
  tradingSuccess: number;
}

interface StrategyStats {
  utilityUsage: number;
  positioningScore: number;
  strategyAdherence: number;
  impactRating: number;
  successfulCalls: number;
  failedCalls: number;
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
  matchStats: MatchStats;
  strategyStats: StrategyStats;
}

interface RoleRequirements {
  [key: string]: {
    aim: number;
    reaction: number;
    positioning: number;
    utility: number;
    leadership: number;
    clutch: number;
  };
}

class AgentSystem {
  private readonly ROLES = [
    'Entry Fragger',
    'AWPer',
    'Support',
    'In-Game Leader',
    'Lurker'
  ];

  private readonly ROLE_REQUIREMENTS: RoleRequirements = {
    'Entry Fragger': {
      aim: 0.8,
      reaction: 0.9,
      positioning: 0.7,
      utility: 0.5,
      leadership: 0.3,
      clutch: 0.6
    },
    'AWPer': {
      aim: 0.9,
      reaction: 0.8,
      positioning: 0.8,
      utility: 0.4,
      leadership: 0.3,
      clutch: 0.7
    },
    'Support': {
      aim: 0.6,
      reaction: 0.6,
      positioning: 0.8,
      utility: 0.9,
      leadership: 0.5,
      clutch: 0.5
    },
    'In-Game Leader': {
      aim: 0.6,
      reaction: 0.6,
      positioning: 0.7,
      utility: 0.7,
      leadership: 0.9,
      clutch: 0.6
    },
    'Lurker': {
      aim: 0.7,
      reaction: 0.7,
      positioning: 0.9,
      utility: 0.5,
      leadership: 0.4,
      clutch: 0.8
    }
  };

  generateAgent(team: 't' | 'ct', preferredRole?: string): Agent {
    const stats = this.generateStats();
    const role = preferredRole || this.determineOptimalRole(stats);
    const name = this.generateName();

    return {
      id: `${team}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      team,
      role,
      position: { x: 0, y: 0 },
      isAlive: true,
      health: 100,
      armor: 0,
      weapons: [],
      equipment: [],
      stats,
      matchStats: this.initializeMatchStats(),
      strategyStats: this.initializeStrategyStats()
    };
  }

  private generateStats(): AgentStats {
    return {
      aim: this.normalizedRandom(0.5, 0.95),
      reaction: this.normalizedRandom(0.5, 0.95),
      positioning: this.normalizedRandom(0.5, 0.95),
      utility: this.normalizedRandom(0.5, 0.95),
      leadership: this.normalizedRandom(0.5, 0.95),
      clutch: this.normalizedRandom(0.5, 0.95)
    };
  }

  private initializeMatchStats(): MatchStats {
    return {
      kills: 0,
      deaths: 0,
      assists: 0,
      utilityDamage: 0,
      flashAssists: 0,
      tradingSuccess: 0
    };
  }

  private initializeStrategyStats(): StrategyStats {
    return {
      utilityUsage: 0,
      positioningScore: 0,
      strategyAdherence: 0,
      impactRating: 0,
      successfulCalls: 0,
      failedCalls: 0
    };
  }

  private determineOptimalRole(stats: AgentStats): string {
    let bestRole = this.ROLES[0];
    let bestScore = -1;

    for (const role of this.ROLES) {
      const requirements = this.ROLE_REQUIREMENTS[role];
      const score = this.calculateRoleScore(stats, requirements);
      
      if (score > bestScore) {
        bestScore = score;
        bestRole = role;
      }
    }

    return bestRole;
  }

  private calculateRoleScore(stats: AgentStats, requirements: AgentStats): number {
    let score = 0;
    let totalWeight = 0;

    for (const [stat, requirement] of Object.entries(requirements)) {
      const weight = requirement;
      score += stats[stat as keyof AgentStats] * weight;
      totalWeight += weight;
    }

    return score / totalWeight;
  }

  calculateImpactRating(agent: Agent): number {
    const {
      kills,
      assists,
      utilityDamage,
      flashAssists,
      tradingSuccess
    } = agent.matchStats;

    const {
      utilityUsage,
      positioningScore,
      strategyAdherence
    } = agent.strategyStats;

    // Calculate base impact from actions
    const killImpact = kills * 1.0;
    const assistImpact = assists * 0.3;
    const utilityImpact = (utilityDamage / 100) * 0.4;
    const flashImpact = flashAssists * 0.2;
    const tradeImpact = tradingSuccess * 0.5;

    // Calculate strategy impact
    const strategyImpact = (
      utilityUsage * 0.3 +
      positioningScore * 0.4 +
      strategyAdherence * 0.3
    );

    // Combine all factors
    const totalImpact = (
      killImpact +
      assistImpact +
      utilityImpact +
      flashImpact +
      tradeImpact +
      strategyImpact
    ) / 6;

    return Math.min(1, totalImpact);
  }

  evaluateStrategyExecution(
    agent: Agent,
    strategy: string,
    roundOutcome: 'success' | 'failure'
  ): void {
    if (roundOutcome === 'success') {
      agent.strategyStats.successfulCalls++;
    } else {
      agent.strategyStats.failedCalls++;
    }

    // Update strategy adherence based on performance
    const totalCalls = 
      agent.strategyStats.successfulCalls + 
      agent.strategyStats.failedCalls;
    
    if (totalCalls > 0) {
      agent.strategyStats.strategyAdherence = 
        agent.strategyStats.successfulCalls / totalCalls;
    }
  }

  private normalizedRandom(min: number, max: number): number {
    // Generate a more normal distribution between min and max
    const u1 = Math.random();
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const normalized = (normal + 3) / 6; // Convert to 0-1 range
    return Math.min(max, Math.max(min, min + (max - min) * normalized));
  }

  private generateName(): string {
    const firstNames = [
      "Alex", "Max", "Sam", "Jordan", "Casey",
      "Olof", "Nikola", "Sasha", "Viktor", "Denis"
    ];
    
    const lastNames = [
      "Smith", "Jones", "Berg", "Storm", "Kraft",
      "Popov", "Kovac", "Miller", "King", "Young"
    ];

    return `${
      firstNames[Math.floor(Math.random() * firstNames.length)]
    } "${
      this.generateNickname()
    }" ${
      lastNames[Math.floor(Math.random() * lastNames.length)]
    }`;
  }

  private generateNickname(): string {
    const nicknames = [
      "ace", "clutch", "flash", "swift", "shadow",
      "storm", "hawk", "steel", "blade", "frost"
    ];

    return nicknames[Math.floor(Math.random() * nicknames.length)];
  }
}

export default AgentSystem;