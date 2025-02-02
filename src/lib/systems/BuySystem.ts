interface Weapon {
  cost: number;
  type: 'pistol' | 'smg' | 'rifle' | 'sniper';
  preference: string[];
}

interface Equipment {
  cost: number;
  priority: number;
  ctOnly?: boolean;
}

interface BuyStrategy {
  maxSpend: number;
  priorities: Record<string, number>;
}

interface Loadout {
  weapons: string[];
  equipment: string[];
  total: number;
}

class BuySystem {
  private weapons: Record<string, Weapon>;
  private equipment: Record<string, Equipment>;
  private buyStrategies: Record<string, BuyStrategy>;

  constructor() {
    this.weapons = {
      // Pistols
      glock: { cost: 200, type: 'pistol', preference: ['Entry Fragger'] },
      usp: { cost: 200, type: 'pistol', preference: ['Support'] },
      deagle: { cost: 700, type: 'pistol', preference: ['AWPer', 'Entry Fragger'] },

      // SMGs
      mp9: { cost: 1250, type: 'smg', preference: ['Support', 'In-Game Leader'] },
      mac10: { cost: 1050, type: 'smg', preference: ['Entry Fragger', 'Lurker'] },

      // Rifles
      ak47: { cost: 2700, type: 'rifle', preference: ['Entry Fragger', 'Lurker'] },
      m4a4: { cost: 3100, type: 'rifle', preference: ['Support', 'In-Game Leader'] },
      awp: { cost: 4750, type: 'sniper', preference: ['AWPer'] }
    };

    this.equipment = {
      kevlar: { cost: 650, priority: 1 },
      helmet: { cost: 350, priority: 2 },
      defuse: { cost: 400, priority: 3, ctOnly: true },
      flash: { cost: 200, priority: 4 },
      smoke: { cost: 300, priority: 5 },
      molotov: { cost: 400, priority: 6 }
    };

    this.buyStrategies = {
      eco: {
        maxSpend: 2000,
        priorities: {
          pistol: 0.7,
          kevlar: 0.3
        }
      },
      semi: {
        maxSpend: 4000,
        priorities: {
          smg: 0.5,
          kevlar: 0.3,
          utility: 0.2
        }
      },
      full: {
        maxSpend: 7000,
        priorities: {
          primary: 0.6,
          kevlar: 0.2,
          utility: 0.2
        }
      }
    };
  }

  calculateAgentBuy(agent: any, money: number, strategy: string, side: 't' | 'ct'): Loadout {
    const loadout: Loadout = {
      weapons: [],
      equipment: [],
      total: 0
    };

    if (money < 0 || !this.buyStrategies[strategy]) {
      return loadout;
    }

    const buyStrategy = this.buyStrategies[strategy];
    const maxSpend = Math.min(money, buyStrategy.maxSpend);
    let remainingMoney = maxSpend;

    // Primary weapon selection based on strategy and role
    if (strategy === 'full' || (strategy === 'semi' && remainingMoney > 2000)) {
      const weapon = this.selectWeaponForAgent(agent, strategy, remainingMoney);
      if (weapon) {
        loadout.weapons.push(weapon);
        remainingMoney -= this.weapons[weapon].cost;
      }
    }

    // Always consider pistol if no primary or eco round
    if (loadout.weapons.length === 0 || strategy === 'eco') {
      const pistol = this.selectPistolForAgent(agent, remainingMoney);
      if (pistol) {
        loadout.weapons.push(pistol);
        remainingMoney -= this.weapons[pistol].cost;
      }
    }

    // Equipment selection
    const equipmentList = this.selectEquipment(agent, remainingMoney, strategy, side);
    loadout.equipment = equipmentList;
    remainingMoney -= equipmentList.reduce((sum, item) => sum + this.equipment[item].cost, 0);

    loadout.total = maxSpend - remainingMoney;
    return loadout;
  }

  private selectWeaponForAgent(agent: any, strategy: string, money: number): string | null {
    const preferredWeapons = Object.entries(this.weapons)
      .filter(([name, weapon]) => {
        const matchesStrategy =
          (strategy === 'full' && (weapon.type === 'rifle' || weapon.type === 'sniper')) ||
          (strategy === 'semi' && weapon.type === 'smg');
        const isPreferred = weapon.preference.includes(agent.role);
        const isAffordable = weapon.cost <= money;

        return matchesStrategy && isPreferred && isAffordable;
      })
      .sort((a, b) => {
        const aPreferenceIndex = a[1].preference.indexOf(agent.role);
        const bPreferenceIndex = b[1].preference.indexOf(agent.role);
        if (aPreferenceIndex !== bPreferenceIndex) {
          return aPreferenceIndex - bPreferenceIndex;
        }
        return b[1].cost - a[1].cost;
      });

    return preferredWeapons.length > 0 ? preferredWeapons[0][0] : null;
  }

  private selectPistolForAgent(agent: any, money: number): string | null {
    const affordablePistols = Object.entries(this.weapons)
      .filter(([name, weapon]) => weapon.type === 'pistol' && weapon.cost <= money)
      .sort((a, b) => {
        const aPreferred = a[1].preference.includes(agent.role) ? 1 : 0;
        const bPreferred = b[1].preference.includes(agent.role) ? 1 : 0;
        if (aPreferred !== bPreferred) {
          return bPreferred - aPreferred;
        }
        return b[1].cost - a[1].cost;
      });

    return affordablePistols.length > 0 ? affordablePistols[0][0] : null;
  }

  private selectEquipment(agent: any, money: number, strategy: string, side: 't' | 'ct'): string[] {
    const equipment: string[] = [];
    let remainingMoney = money;

    if (remainingMoney <= 0) return equipment;

    const prioritizedEquipment = Object.entries(this.equipment)
      .filter(([name, item]) => !item.ctOnly || side === 'ct')
      .sort((a, b) => a[1].priority - b[1].priority);

    if (strategy !== 'eco' && remainingMoney >= this.equipment.kevlar.cost) {
      equipment.push('kevlar');
      remainingMoney -= this.equipment.kevlar.cost;

      if (remainingMoney >= this.equipment.helmet.cost) {
        equipment.push('helmet');
        remainingMoney -= this.equipment.helmet.cost;
      }
    }

    prioritizedEquipment.forEach(([name, item]) => {
      if (item.cost <= remainingMoney) {
        equipment.push(name);
        remainingMoney -= item.cost;
      }
    });

    return equipment;
  }

  calculateTeamBuy(agents: any[], teamMoney: number, strategy: string, side: 't' | 'ct') {
    if (agents.length === 0 || teamMoney <= 0) {
      return [];
    }

    const individualMoney = Math.floor(teamMoney / agents.length);

    return agents.map((agent) => ({
      agent: agent.id,
      loadout: this.calculateAgentBuy(agent, individualMoney, strategy, side),
    }));
  }
}

export default BuySystem;