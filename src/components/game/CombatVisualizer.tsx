'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Shield, Target, Zap, Skull, Gun, Star } from 'lucide-react';
import { useGame } from '@/components/game-provider';
import { toast } from 'sonner';

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
  position?: {
    x: number;
    y: number;
  };
  timestamp: number;
}

interface CombatVisualizerProps {
  combatResult: CombatResult;
  onAnimationComplete: () => void;
}

const CombatVisualizer: React.FC<CombatVisualizerProps> = ({
  combatResult,
  onAnimationComplete
}) => {
  const { gameState } = useGame();
  const [isVisible, setIsVisible] = useState(true);
  const [animationClass, setAnimationClass] = useState('animate-slide-in');

  const handleAnimationComplete = useCallback(() => {
    try {
      setIsVisible(false);
      onAnimationComplete();
    } catch (error) {
      console.error('Error completing animation:', error);
      toast.error('Failed to complete combat animation');
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationClass('animate-fade-out');
      setTimeout(handleAnimationComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [handleAnimationComplete]);

  const getTeamColor = (team: 't' | 'ct') => {
    return team === 't' ? 'text-yellow-400' : 'text-blue-400';
  };

  const getEventIcon = () => {
    switch (combatResult.type) {
      case 'kill':
        return combatResult.isHeadshot ? 
          <Star className="w-5 h-5 text-red-500" /> :
          <Skull className="w-5 h-5 text-red-500" />;
      case 'damage':
        return <Target className="w-5 h-5 text-orange-500" />;
      case 'utility':
        return <Zap className="w-5 h-5 text-blue-500" />;
      case 'trade':
        return <Shield className="w-5 h-5 text-purple-500" />;
      case 'assist':
        return <Gun className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getWeaponDisplay = (weapon: string) => {
    const weaponIcons: { [key: string]: string } = {
      'ak47': '🔫 AK-47',
      'm4a4': '🔫 M4A4',
      'awp': '🎯 AWP',
      'deagle': '🔫 Desert Eagle',
      'flash': '💥 Flash',
      'smoke': '💨 Smoke',
      'molotov': '🔥 Molotov',
    };
    return weaponIcons[weapon] || weapon;
  };

  const getEventDescription = () => {
    const attackerName = (
      <span className={`${getTeamColor(combatResult.attacker.team)} font-semibold`}>
        {combatResult.attacker.name}
      </span>
    );

    const victimName = combatResult.victim && (
      <span className={`${getTeamColor(combatResult.victim.team)} font-semibold`}>
        {combatResult.victim.name}
      </span>
    );

    const renderBadges = () => (
      <div className="flex gap-1 items-center">
        {combatResult.isHeadshot && (
          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded">
            Headshot
          </span>
        )}
        {combatResult.isStrategyKill && (
          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">
            Strategy
          </span>
        )}
        {combatResult.isTradeKill && (
          <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">
            Trade
          </span>
        )}
        {combatResult.isWallbang && (
          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">
            Wallbang
          </span>
        )}
      </div>
    );

    switch (combatResult.type) {
      case 'kill':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {attackerName}
              <span className="text-gray-400">
                {combatResult.isHeadshot ? 'headshotted' : 'killed'}
              </span>
              {victimName}
              {combatResult.weapon && (
                <span className="text-gray-400">
                  with {getWeaponDisplay(combatResult.weapon)}
                </span>
              )}
            </div>
            {renderBadges()}
          </div>
        );
      case 'damage':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">damaged</span>
            {victimName}
            <span className="text-orange-400 font-mono">
              -{combatResult.damage}HP
            </span>
          </div>
        );
      case 'utility':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">used</span>
            {combatResult.weapon && (
              <span className="text-blue-400">
                {getWeaponDisplay(combatResult.weapon)}
              </span>
            )}
            {combatResult.damage && (
              <span className="text-orange-400 font-mono">
                ({combatResult.damage}HP damage)
              </span>
            )}
          </div>
        );
      case 'trade':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {attackerName}
              <span className="text-gray-400">traded</span>
              {victimName}
            </div>
            {renderBadges()}
          </div>
        );
      case 'assist':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">assisted in killing</span>
            {victimName}
          </div>
        );
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <Card className={`
      fixed bottom-4 right-4 
      bg-gray-800/95 text-white 
      p-4 rounded-lg shadow-lg
      transition-all duration-500
      backdrop-blur-sm
      border border-gray-700
      ${animationClass}
    `}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-700 rounded-full">
          {getEventIcon()}
        </div>
        <div className="space-y-1">
          {getEventDescription()}
          <div className="flex gap-2 text-xs text-gray-400">
            {combatResult.position && (
              <span>
                📍 {Math.round(combatResult.position.x)}, 
                {Math.round(combatResult.position.y)}
              </span>
            )}
            {combatResult.attacker.role && (
              <span>👤 {combatResult.attacker.role}</span>
            )}
            <span>
              ⏱️ {new Date(combatResult.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CombatVisualizer;