// CombatSystem.ts
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

interface CombatResult {
  type: 'kill' | 'damage' | 'utility' | 'trade';
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
  position?: Position;
}

class CombatSystem {
  private readonly TRADE_KILL_TIME = 3000; // 3 seconds window for trade kills
  private readonly MAX_FLASH_DURATION = 3000;
  private readonly BASE_DAMAGE = {
    rifle: { body: 25, head: 100 },
    smg: { body: 20, head: 80 },
    pistol: { body: 15, head: 65 },
    awp: { body: 100, head: 100 },
    utility: {
      molotov: 40,
      grenade: 50,
      flash: 0
    }
  };

  private lastDeaths: Map<string, {
    time: number;
    position: Position;
    killer: string;
  }> = new Map();

  processCombatRound(
    agents: Agent[],
    state: any,
    strategies: { t: string; ct: string }
  ): CombatResult[] {
    const results: CombatResult[] = [];
    const aliveAgents = agents.filter(a => a.isAlive);

    // Process combat for each alive agent
    aliveAgents.forEach(attacker => {
      const targets = this.findValidTargets(attacker, aliveAgents);
      
      targets.forEach(target => {
        // Check if combat occurs based on strategy and positions
        if (this.shouldEngageCombat(attacker, target, strategies)) {
          const combatResult = this.resolveCombat(attacker, target, strategies);
          if (combatResult) {
            results.push(combatResult);
          }
        }
      });

      // Process utility usage
      if (attacker.equipment.length > 0) {
        const utilityResult = this.processUtilityUsage(attacker, aliveAgents, strategies);
        if (utilityResult) {
          results.push(...utilityResult);
        }
      }
    });

    return results;
  }

  private shouldEngageCombat(
    attacker: Agent,
    target: Agent,
    strategies: { t: string; ct: string }
  ): boolean {
    const distance = this.calculateDistance(attacker.position, target.position);
    const strategy = strategies[attacker.team];

    // Strategy-based engagement rules
    switch (strategy) {
      case 'rush_b':
        return distance < 50 || attacker.role === 'Entry Fragger';
      case 'default':
        return distance < 80;
      case 'eco_rush':
        return distance < 30;
      case 'split_a':
        return distance < 60 || this.isValidFlank(attacker, target);
      default:
        return distance < 70;
    }
  }

  private resolveCombat(
    attacker: Agent,
    target: Agent,
    strategies: { t: string; ct: string }
  ): CombatResult | null {
    const weapon = this.getPrimaryWeapon(attacker);
    if (!weapon) return null;

    // Calculate hit probability based on multiple factors
    const baseProbability = this.calculateHitProbability(attacker, target, strategies);
    const distance = this.calculateDistance(attacker.position, target.position);
    const isHeadshot = Math.random() < (attacker.stats.aim * 0.3);

    if (Math.random() < baseProbability) {
      const damage = this.calculateDamage(weapon, distance, isHeadshot, target.armor);
      target.health -= damage;

      // Update stats
      if (target.health <= 0) {
        target.isAlive = false;
        attacker.matchStats.kills++;
        target.matchStats.deaths++;

        // Check for trade kill
        const isTradeKill = this.checkTradeKill(attacker, target);
        
        // Update last deaths for trade kill tracking
        this.lastDeaths.set(target.id, {
          time: Date.now(),
          position: { ...target.position },
          killer: attacker.id
        });

        return {
          type: 'kill',
          attacker: {
            id: attacker.id,
            name: attacker.name,
            team: attacker.team,
            role: attacker.role
          },
          victim: {
            id: target.id,
            name: target.name,
            team: target.team,
            role: target.role
          },
          weapon,
          damage,
          isHeadshot,
          isStrategyKill: this.isStrategyBasedKill(attacker, target, strategies),
          isTradeKill,
          position: { ...target.position }
        };
      }

      return {
        type: 'damage',
        attacker: {
          id: attacker.id,
          name: attacker.name,
          team: attacker.team,
          role: attacker.role
        },
        victim: {
          id: target.id,
          name: target.name,
          team: target.team,
          role: target.role
        },
        weapon,
        damage,
        position: { ...target.position }
      };
    }

    return null;
  }

  private processUtilityUsage(
    attacker: Agent,
    targets: Agent[],
    strategies: { t: string; ct: string }
  ): CombatResult[] {
    const results: CombatResult[] = [];
    const utilities = [...attacker.equipment];

    utilities.forEach(utility => {
      const affectedTargets = this.findUtilityTargets(attacker, targets, utility);
      
      affectedTargets.forEach(target => {
        const damage = this.BASE_DAMAGE.utility[utility] || 0;
        
        if (utility === 'flash') {
          // Process flash effects
          this.processFlashEffect(attacker, target);
        } else if (damage > 0) {
          target.health -= damage;
          target.matchStats.utilityDamage += damage;

          results.push({
            type: 'utility',
            attacker: {
              id: attacker.id,
              name: attacker.name,
              team: attacker.team,
              role: attacker.role
            },
            victim: {
              id: target.id,
              name: target.name,
              team: target.team,
              role: target.role
            },
            damage,
            position: { ...target.position }
          });
        }
      });

      // Update utility usage stats
      attacker.strategyStats.utilityUsage += 0.2;
    });

    return results;
  }

  private calculateHitProbability(
    attacker: Agent,
    target: Agent,
    strategies: { t: string; ct: string }
  ): number {
    const distance = this.calculateDistance(attacker.position, target.position);
    const baseAccuracy = attacker.stats.aim;
    const positioningBonus = attacker.strategyStats.positioningScore * 0.2;
    const strategyBonus = this.getStrategyBonus(attacker, strategies[attacker.team]);
    const distancePenalty = Math.min(1, 100 / distance);

    return Math.min(0.9, baseAccuracy * distancePenalty + positioningBonus + strategyBonus);
  }

  private getStrategyBonus(attacker: Agent, strategy: string): number {
    switch (strategy) {
      case 'rush_b':
        return attacker.role === 'Entry Fragger' ? 0.15 : 0.05;
      case 'split_a':
        return attacker.role === 'Lurker' ? 0.1 : 0.05;
      case 'eco_rush':
        return 0.1;
      default:
        return 0;
    }
  }

  private calculateDamage(
    weapon: string,
    distance: number,
    isHeadshot: boolean,
    targetArmor: number
  ): number {
    const weaponType = this.getWeaponType(weapon);
    const baseDamage = isHeadshot 
      ? this.BASE_DAMAGE[weaponType].head 
      : this.BASE_DAMAGE[weaponType].body;

    const distanceMultiplier = Math.max(0.5, 1 - (distance / 200));
    const armorMultiplier = targetArmor > 0 ? 0.75 : 1;

    return Math.floor(baseDamage * distanceMultiplier * armorMultiplier);
  }

  private findValidTargets(attacker: Agent, agents: Agent[]): Agent[] {
    return agents.filter(target => 
      target.team !== attacker.team &&
      target.isAlive &&
      this.hasLineOfSight(attacker.position, target.position)
    );
  }

  private findUtilityTargets(
    attacker: Agent,
    targets: Agent[],
    utility: string
  ): Agent[] {
    const radius = utility === 'flash' ? 100 : 50;
    return targets.filter(target =>
      target.team !== attacker.team &&
      target.isAlive &&
      this.calculateDistance(attacker.position, target.position) <= radius
    );
  }

  private hasLineOfSight(pos1: Position, pos2: Position): boolean {
    // Simplified line of sight check - can be enhanced with map geometry
    return true;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private isValidFlank(attacker: Agent, target: Agent): boolean {
    // Calculate angle between attacker and target
    const angle = Math.atan2(
      target.position.y - attacker.position.y,
      target.position.x - attacker.position.x
    );
    
    // Consider it a flank if attacking from behind (120 degree cone)
    return Math.abs(angle) > (2 * Math.PI / 3);
  }

  private checkTradeKill(attacker: Agent, victim: Agent): boolean {
    const lastDeath = this.lastDeaths.get(attacker.id);
    if (!lastDeath) return false;

    const timeSinceLastDeath = Date.now() - lastDeath.time;
    return timeSinceLastDeath <= this.TRADE_KILL_TIME;
  }

  private isStrategyBasedKill(
    attacker: Agent,
    victim: Agent,
    strategies: { t: string; ct: string }
  ): boolean {
    const attackerStrategy = strategies[attacker.team];
    const distance = this.calculateDistance(attacker.position, victim.position);

    // Check if kill aligns with current strategy
    switch (attackerStrategy) {
      case 'rush_b':
        return distance < 50 && attacker.role === 'Entry Fragger';
      case 'split_a':
        return this.isValidFlank(attacker, victim);
      case 'eco_rush':
        return distance < 30;
      default:
        return attacker.strategyStats.positioningScore > 0.7;
    }
  }

  private getWeaponType(weapon: string): 'rifle' | 'smg' | 'pistol' | 'awp' {
    if (weapon === 'awp') return 'awp';
    if (['ak47', 'm4a4'].includes(weapon)) return 'rifle';
    if (['mac10', 'mp9'].includes(weapon)) return 'smg';
    return 'pistol';
  }

  private getPrimaryWeapon(agent: Agent): string | null {
    return agent.weapons[0] || null;
  }

  private processFlashEffect(attacker: Agent, target: Agent): void {
    // Update flash assist stats
    attacker.matchStats.flashAssists++;
    target.strategyStats.positioningScore *= 0.8; // Temporary penalty for being flashed
  }
}

export default CombatSystem;