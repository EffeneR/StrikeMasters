// CombatVisualizer.tsx
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Shield, Target, Zap, Skull } from 'lucide-react';

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
  position?: {
    x: number;
    y: number;
  };
}

interface CombatVisualizerProps {
  combatResult: CombatResult;
  onAnimationComplete: () => void;
}

const CombatVisualizer: React.FC<CombatVisualizerProps> = ({
  combatResult,
  onAnimationComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationClass, setAnimationClass] = useState('animate-slide-in');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationClass('animate-fade-out');
      setTimeout(() => {
        setIsVisible(false);
        onAnimationComplete();
      }, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  const getTeamColor = (team: 't' | 'ct') => {
    return team === 't' ? 'text-yellow-400' : 'text-blue-400';
  };

  const getEventIcon = () => {
    switch (combatResult.type) {
      case 'kill':
        return <Skull className="w-5 h-5 text-red-500" />;
      case 'damage':
        return <Target className="w-5 h-5 text-orange-500" />;
      case 'utility':
        return <Zap className="w-5 h-5 text-blue-500" />;
      case 'trade':
        return <Shield className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getEventDescription = () => {
    const attackerName = (
      <span className={getTeamColor(combatResult.attacker.team)}>
        {combatResult.attacker.name}
      </span>
    );

    const victimName = combatResult.victim && (
      <span className={getTeamColor(combatResult.victim.team)}>
        {combatResult.victim.name}
      </span>
    );

    switch (combatResult.type) {
      case 'kill':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">
              {combatResult.isHeadshot ? 'headshotted' : 'killed'}
            </span>
            {victimName}
            {combatResult.weapon && (
              <span className="text-gray-400">with {combatResult.weapon}</span>
            )}
            {combatResult.isStrategyKill && (
              <span className="text-green-400 text-sm">(Strategy Kill!)</span>
            )}
            {combatResult.isTradeKill && (
              <span className="text-purple-400 text-sm">(Trade Kill!)</span>
            )}
          </div>
        );
      case 'damage':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">damaged</span>
            {victimName}
            <span className="text-orange-400">
              -{combatResult.damage}HP
            </span>
          </div>
        );
      case 'utility':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">used utility</span>
            {combatResult.damage && (
              <span className="text-orange-400">
                ({combatResult.damage}HP damage)
              </span>
            )}
          </div>
        );
      case 'trade':
        return (
          <div className="flex items-center gap-2">
            {attackerName}
            <span className="text-gray-400">traded</span>
            {victimName}
            <span className="text-purple-400">(Trade Kill)</span>
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
      bg-gray-800 text-white 
      p-4 rounded-lg shadow-lg
      transition-all duration-500
      ${animationClass}
    `}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-700 rounded-full">
          {getEventIcon()}
        </div>
        <div className="space-y-1">
          {getEventDescription()}
          {combatResult.position && (
            <div className="text-sm text-gray-400">
              Location: {Math.round(combatResult.position.x)}, 
              {Math.round(combatResult.position.y)}
            </div>
          )}
          {combatResult.attacker.role && (
            <div className="text-sm text-gray-400">
              Role: {combatResult.attacker.role}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CombatVisualizer;