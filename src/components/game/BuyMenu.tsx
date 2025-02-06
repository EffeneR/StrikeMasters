'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Target, DollarSign } from 'lucide-react';
import { useGame } from '@/components/game-provider';
import { toast } from 'sonner';

interface Loadout {
  weapons: string[];
  equipment: string[];
  total: number;
}

interface WeaponInfo {
  name: string;
  cost: number;
  type: 'pistol' | 'smg' | 'rifle' | 'sniper';
  recommendedFor: string[];
  icon?: string;
}

interface EquipmentInfo {
  name: string;
  cost: number;
  type: 'armor' | 'utility';
  priority: number;
  icon?: string;
}

const WEAPONS: { [key: string]: WeaponInfo } = {
  glock: { name: 'Glock', cost: 200, type: 'pistol', recommendedFor: ['Entry Fragger'] },
  usp: { name: 'USP', cost: 200, type: 'pistol', recommendedFor: ['Support'] },
  deagle: { name: 'Desert Eagle', cost: 700, type: 'pistol', recommendedFor: ['AWPer', 'Entry Fragger'] },
  mac10: { name: 'MAC-10', cost: 1050, type: 'smg', recommendedFor: ['Entry Fragger', 'Lurker'] },
  mp9: { name: 'MP9', cost: 1250, type: 'smg', recommendedFor: ['Support', 'In-Game Leader'] },
  ak47: { name: 'AK-47', cost: 2700, type: 'rifle', recommendedFor: ['Entry Fragger', 'Lurker'] },
  m4a4: { name: 'M4A4', cost: 3100, type: 'rifle', recommendedFor: ['Support', 'In-Game Leader'] },
  awp: { name: 'AWP', cost: 4750, type: 'sniper', recommendedFor: ['AWPer'] }
};

const EQUIPMENT: { [key: string]: EquipmentInfo } = {
  kevlar: { name: 'Kevlar Vest', cost: 650, type: 'armor', priority: 1 },
  helmet: { name: 'Helmet', cost: 350, type: 'armor', priority: 2 },
  flash: { name: 'Flashbang', cost: 200, type: 'utility', priority: 4 },
  smoke: { name: 'Smoke Grenade', cost: 300, type: 'utility', priority: 5 },
  molotov: { name: 'Molotov', cost: 400, type: 'utility', priority: 6 },
  defuse: { name: 'Defuse Kit', cost: 400, type: 'utility', priority: 3 }
};

const STRATEGY_LOADOUTS = {
  rush_b: {
    'Entry Fragger': ['mac10', 'flash', 'flash'],
    'Support': ['mp9', 'smoke', 'flash'],
    'AWPer': ['mp9', 'flash'],
    'In-Game Leader': ['mac10', 'smoke', 'molotov'],
    'Lurker': ['mac10', 'smoke']
  },
  split_a: {
    'Entry Fragger': ['ak47', 'flash', 'flash'],
    'Support': ['m4a4', 'smoke', 'smoke'],
    'AWPer': ['awp', 'flash'],
    'In-Game Leader': ['m4a4', 'smoke', 'molotov'],
    'Lurker': ['ak47', 'smoke']
  },
  eco_rush: {
    'Entry Fragger': ['deagle', 'flash'],
    'Support': ['mp9', 'flash'],
    'AWPer': ['deagle'],
    'In-Game Leader': ['deagle', 'smoke'],
    'Lurker': ['deagle']
  },
  default: {
    'Entry Fragger': ['ak47', 'flash', 'flash'],
    'Support': ['m4a4', 'smoke', 'flash'],
    'AWPer': ['awp'],
    'In-Game Leader': ['m4a4', 'smoke', 'molotov'],
    'Lurker': ['ak47', 'smoke']
  }
};

const BuyMenu: React.FC = () => {
  const { gameState, buyEquipment } = useGame();
  const [loadout, setLoadout] = useState<Loadout>({ weapons: [], equipment: [], total: 0 });
  const [recommendedLoadout, setRecommendedLoadout] = useState<Loadout | null>(null);

  // Get current player's team and money
  const currentTeam = gameState.teams[gameState.currentPlayer?.team || 't'];
  const money = currentTeam?.money || 0;
  const strategy = gameState.round.currentStrategy[gameState.currentPlayer?.team || 't'] || 'default';
  const agent = gameState.currentPlayer;

  useEffect(() => {
    if (!agent?.role) return;

    try {
      const strategyLoadout = STRATEGY_LOADOUTS[strategy]?.[agent.role] || STRATEGY_LOADOUTS.default[agent.role];
      if (strategyLoadout) {
        const weapons = strategyLoadout.filter(item => WEAPONS[item]);
        const equipment = strategyLoadout.filter(item => EQUIPMENT[item]);
        const total = calculateLoadoutCost(weapons, equipment);

        setRecommendedLoadout({
          weapons,
          equipment,
          total
        });
      }
    } catch (error) {
      console.error('Error generating recommended loadout:', error);
      toast.error('Failed to generate recommended loadout');
    }
  }, [strategy, agent?.role]);

  const calculateLoadoutCost = (weapons: string[], equipment: string[]): number => {
    const weaponsCost = weapons.reduce((sum, weapon) => sum + (WEAPONS[weapon]?.cost || 0), 0);
    const equipmentCost = equipment.reduce((sum, item) => sum + (EQUIPMENT[item]?.cost || 0), 0);
    return weaponsCost + equipmentCost;
  };

  const handleBuyStrategy = (buyType: 'full' | 'semi' | 'eco') => {
    if (!agent) {
      toast.error('No active player selected');
      return;
    }

    try {
      let maxSpend = 0;
      let suggestedLoadout: Loadout = { weapons: [], equipment: [], total: 0 };

      switch (buyType) {
        case 'full':
          maxSpend = Math.min(money, 4500);
          suggestedLoadout = getStrategyBasedLoadout(maxSpend);
          break;
        case 'semi':
          maxSpend = Math.min(money, 2500);
          suggestedLoadout = getEconomyLoadout(maxSpend);
          break;
        case 'eco':
          maxSpend = Math.min(money, 1000);
          suggestedLoadout = getEcoLoadout();
          break;
      }

      setLoadout(suggestedLoadout);
      buyEquipment(agent, suggestedLoadout);
      toast.success('Equipment purchased successfully');
    } catch (error) {
      console.error('Error buying equipment:', error);
      toast.error('Failed to purchase equipment');
    }
  };

  const getStrategyBasedLoadout = (maxSpend: number): Loadout => {
    if (!agent?.role) {
      throw new Error('No agent role defined');
    }

    const strategyLoadout = STRATEGY_LOADOUTS[strategy]?.[agent.role] || 
                           STRATEGY_LOADOUTS.default[agent.role];
    let weapons: string[] = [];
    let equipment: string[] = [];
    let remainingMoney = maxSpend;

    for (const item of strategyLoadout) {
      if (WEAPONS[item] && WEAPONS[item].cost <= remainingMoney) {
        weapons.push(item);
        remainingMoney -= WEAPONS[item].cost;
      } else if (EQUIPMENT[item] && EQUIPMENT[item].cost <= remainingMoney) {
        equipment.push(item);
        remainingMoney -= EQUIPMENT[item].cost;
      }
    }

    if (remainingMoney >= EQUIPMENT.kevlar.cost) {
      equipment.push('kevlar');
      remainingMoney -= EQUIPMENT.kevlar.cost;

      if (remainingMoney >= EQUIPMENT.helmet.cost) {
        equipment.push('helmet');
        remainingMoney -= EQUIPMENT.helmet.cost;
      }
    }

    return {
      weapons,
      equipment,
      total: maxSpend - remainingMoney
    };
  };

  const getEconomyLoadout = (maxSpend: number): Loadout => {
    const weapons = [agent?.team === 't' ? 'mac10' : 'mp9'];
    const equipment = ['kevlar'];
    const total = WEAPONS[weapons[0]].cost + EQUIPMENT.kevlar.cost;
    return { weapons, equipment, total };
  };

  const getEcoLoadout = (): Loadout => {
    const weapons = [agent?.team === 't' ? 'glock' : 'usp'];
    const equipment = money >= 650 ? ['kevlar'] : [];
    const total = WEAPONS[weapons[0]].cost + (equipment.length ? EQUIPMENT.kevlar.cost : 0);
    return { weapons, equipment, total };
  };

  const LoadoutDisplay = ({ loadout }: { loadout: Loadout }) => (
    <div className="mt-4 text-white">
      <h3 className="font-bold mb-2">Loadout:</h3>
      <div className="space-y-2 bg-gray-700 p-4 rounded">
        <div>
          <h4 className="text-sm text-gray-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Weapons:
          </h4>
          {loadout.weapons.map((weapon, i) => (
            <div key={i} className="text-green-400 flex items-center gap-2">
              <span>{WEAPONS[weapon].name}</span>
              <span className="text-gray-400 text-sm">${WEAPONS[weapon].cost}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="text-sm text-gray-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Equipment:
          </h4>
          {loadout.equipment.map((item, i) => (
            <div key={i} className="text-blue-400 flex items-center gap-2">
              <span>{EQUIPMENT[item].name}</span>
              <span className="text-gray-400 text-sm">${EQUIPMENT[item].cost}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-gray-600 flex items-center justify-between">
          <span className="text-gray-400">Total:</span>
          <span className="text-green-400 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {loadout.total}
          </span>
        </div>
      </div>
    </div>
  );

  if (!agent) {
    return (
      <Card className="w-full max-w-md bg-gray-800">
        <div className="p-6 text-center text-gray-400">
          No active player selected
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-gray-800">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Buy Menu</h2>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-xl font-bold text-green-400">${money}</span>
          </div>
        </div>

        {recommendedLoadout && (
          <div className="mb-4 p-2 bg-gray-700 rounded">
            <div className="text-sm text-gray-400 mb-2">Recommended for {strategy}:</div>
            <LoadoutDisplay loadout={recommendedLoadout} />
            <Button
              className="w-full mt-2 bg-blue-600"
              onClick={() => {
                setLoadout(recommendedLoadout);
                buyEquipment(agent, recommendedLoadout);
              }}
              disabled={recommendedLoadout.total > money}
            >
              Buy Recommended (${recommendedLoadout.total})
            </Button>
          </div>
        )}
        
        <div className="space-y-4">
          <Button 
            className="w-full"
            onClick={() => handleBuyStrategy('full')}
            disabled={money < 4000}
          >
            Full Buy (${money >= 4000 ? '4000+' : 'Not enough money'})
          </Button>

          <Button 
            className="w-full"
            onClick={() => handleBuyStrategy('semi')}
            disabled={money < 2500}
          >
            Force Buy (${money >= 2500 ? '2500-4000' : 'Not enough money'})
          </Button>

          <Button 
            className="w-full"
            onClick={() => handleBuyStrategy('eco')}
          >
            Eco (Max $2000)
          </Button>
        </div>

        {loadout.weapons.length > 0 && <LoadoutDisplay loadout={loadout} />}
      </div>
    </Card>
  );
};

export default BuyMenu;