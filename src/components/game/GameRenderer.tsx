'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useGame } from '@/components/game-provider';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import type { GameState, Position, Agent, GameEvent } from '@/types/game';

// Constants and Interfaces
const ROUND_TIME = 115; // 1:55 in seconds
const BOMB_TIME = 40;
const FREEZE_TIME = 15;

interface MapPosition {
  x: number;
  y: number;
  name: string;
  type: 'site' | 'spawn' | 'position';
}

interface StrategyZone {
  x: number;
  y: number;
  radius: number;
  color: string;
  name?: string;
}

interface TacticalLine {
  path: string;
  color: string;
  name: string;
}

// Enhanced Map Constants
const MAP_POSITIONS: Record<string, MapPosition> = {
  // Sites
  a_site: { x: 220, y: 80, name: 'A Site', type: 'site' },
  b_site: { x: 70, y: 220, name: 'B Site', type: 'site' },
  
  // Spawns
  t_spawn: { x: 60, y: 180, name: 'T Spawn', type: 'spawn' },
  ct_spawn: { x: 230, y: 170, name: 'CT Spawn', type: 'spawn' },
  
  // Key positions
  mid: { x: 150, y: 150, name: 'Mid', type: 'position' },
  long_doors: { x: 85, y: 80, name: 'Long Doors', type: 'position' },
  catwalk: { x: 180, y: 120, name: 'Catwalk', type: 'position' },
  goose: { x: 200, y: 90, name: 'Goose', type: 'position' },
  car: { x: 240, y: 70, name: 'Car', type: 'position' },
  upper_tunnels: { x: 80, y: 200, name: 'Upper Tunnels', type: 'position' },
  lower_tunnels: { x: 100, y: 220, name: 'Lower Tunnels', type: 'position' },
  b_platform: { x: 70, y: 220, name: 'B Platform', type: 'position' },
  t_mid: { x: 120, y: 150, name: 'T Mid', type: 'position' },
  window: { x: 150, y: 120, name: 'Window', type: 'position' },
  mid_doors: { x: 150, y: 150, name: 'Mid Doors', type: 'position' },
  xbox: { x: 130, y: 130, name: 'Xbox', type: 'position' }
} as const;

// Enhanced Strategy Paths
const STRATEGY_PATHS: Record<string, TacticalLine> = {
  default_t: {
    path: "M 60,180 L 120,150",
    color: "#ffd700",
    name: "Default T"
  },
  default_ct: {
    path: "M 230,170 L 180,150",
    color: "#4444ff",
    name: "Default CT"
  },
  rush_b: {
    path: "M 60,180 Q 70,190 80,200 T 70,220",
    color: "#ff4444",
    name: "Rush B"
  },
  split_a: {
    path: "M 60,180 Q 85,80 180,120 M 60,180 Q 120,150 180,120",
    color: "#4444ff",
    name: "Split A"
  },
  mid_control: {
    path: "M 60,180 Q 120,150 150,150 T 180,120",
    color: "#44ff44",
    name: "Mid Control"
  },
  long_push: {
    path: "M 60,180 Q 70,130 85,80",
    color: "#ff8800",
    name: "Long Push"
  },
  b_retake: {
    path: "M 230,170 Q 150,200 70,220",
    color: "#00ffff",
    name: "B Retake"
  }
};

// Enhanced Strategy Zones
const STRATEGY_ZONES: Record<string, StrategyZone[]> = {
  rush_b: [
    { x: 70, y: 220, radius: 30, color: "#ff4444", name: "Rush B Target" }
  ],
  split_a: [
    { x: 85, y: 80, radius: 20, color: "#4444ff", name: "Long Control" },
    { x: 180, y: 120, radius: 20, color: "#4444ff", name: "Catwalk Control" }
  ],
  mid_control: [
    { x: 150, y: 150, radius: 25, color: "#44ff44", name: "Mid Control" }
  ],
  default_t: [
    { x: 120, y: 150, radius: 15, color: "#ffd700", name: "Default Position" }
  ],
  default_ct: [
    { x: 180, y: 150, radius: 15, color: "#4444ff", name: "Default Defense" }
  ]
};

// Utility Functions
const getRoleColor = (role: string): string => {
  const roleColors = {
    'Entry Fragger': '#ff4444',
    'AWPer': '#4444ff',
    'Support': '#44ff44',
    'In-Game Leader': '#ffff44',
    'Lurker': '#ff44ff'
  };
  return roleColors[role as keyof typeof roleColors] || '#ffffff';
};

const calculateHealthColor = (health: number): string => {
  if (health <= 0) return '#666666';
  const hue = Math.min(120, (health / 100) * 120);
  return `hsl(${hue}, 100%, 50%)`;
};

// Component Definitions
interface AgentDotProps {
  agent: Agent;
  isSelected?: boolean;
  onClick?: (agent: Agent) => void;
}

const AgentDot: React.FC<AgentDotProps> = ({ 
  agent, 
  isSelected = false,
  onClick 
}) => {
  const position = agent.position || MAP_POSITIONS[`${agent.team}_spawn`];
  const color = agent.team === 't' ? '#ff4444' : '#4444ff';
  const glowColor = agent.team === 't' ? 'rgba(255,68,68,0.3)' : 'rgba(68,68,255,0.3)';
  const healthColor = calculateHealthColor(agent.health || 0);
  
  const handleClick = useCallback(() => {
    if (onClick && agent.isAlive) {
      onClick(agent);
    }
  }, [agent, onClick]);

  return (
    <g 
      transform={`translate(${position.x}, ${position.y})`} 
      className={cn(
        "transition-all duration-300",
        isSelected && "scale-125"
      )}
      filter="url(#glow)"
      onClick={handleClick}
      style={{ cursor: agent.isAlive ? 'pointer' : 'default' }}
    >
      {/* Enhanced visualization components */}
      {agent.isAlive && (
        <>
          {/* Health bar with gradient */}
          <defs>
            <linearGradient id={`health-${agent.id}`}>
              <stop offset="0%" stopColor={healthColor} />
              <stop offset="100%" stopColor={`${healthColor}88`} />
            </linearGradient>
          </defs>
          
          <g className="health-indicator">
            <rect
              x="-10"
              y="8"
              width="20"
              height="3"
              fill="#333"
              rx="1"
            />
            <rect
              x="-10"
              y="8"
              width={`${(agent.health || 100) / 5}`}
              height="3"
              fill={`url(#health-${agent.id})`}
              rx="1"
            />
            {agent.armor > 0 && (
              <rect
                x="-10"
                y="12"
                width={`${agent.armor / 5}`}
                height="2"
                fill="#4444ff"
                rx="1"
              />
            )}
          </g>
          
          {/* Equipment indicators */}
          {agent.equipment?.map((item, index) => (
            <circle
              key={`${agent.id}-equip-${index}`}
              r="2"
              cy="-8"
              cx={index * 5 - 5}
              fill="#4ade80"
              opacity="0.8"
            />
          ))}
        </>
      )}
      
      {/* Base agent visualization */}
      <circle
        r="15"
        fill="none"
        stroke={glowColor}
        strokeWidth="2"
        opacity="0.5"
      />
      <circle 
        r="5" 
        fill={color}
        stroke={agent.isAlive ? '#fff' : '#666'}
        strokeWidth="2"
        opacity={agent.isAlive ? 1 : 0.5}
      />
      
      {/* Role indicator */}
      <circle
        r="2"
        cx="7"
        fill={getRoleColor(agent.role)}
        opacity="0.8"
      />
      
      {/* Name label */}
      <text 
        y="-10" 
        textAnchor="middle" 
        fill={agent.isAlive ? '#fff' : '#666'} 
        fontSize="12"
        className="select-none pointer-events-none"
      >
        {agent.name}
      </text>
    </g>
  );
};

// Main Component
interface GameRendererProps {
  className?: string;
  onAgentSelect?: (agent: Agent) => void;
  selectedAgent?: Agent | null;
}

const GameRenderer: React.FC<GameRendererProps> = ({
  className,
  onAgentSelect,
  selectedAgent
}) => {
  const { state: gameState } = useGame();
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [tacticalLines, setTacticalLines] = useState<string[]>([]);

  const allAgents = useMemo(() => {
    if (!gameState?.teams) return [];
    return [...gameState.teams.t.agents, ...gameState.teams.ct.agents];
  }, [gameState?.teams]);

  // Position updates
  useEffect(() => {
    try {
      const newPositions: Record<string, Position> = {};
      allAgents.forEach((agent) => {
        if (agent.position) {
          newPositions[agent.id] = agent.position;
        }
      });
      setPositions(newPositions);
    } catch (error) {
      console.error('Error updating positions:', error);
      toast.error('Failed to update agent positions');
    }
  }, [allAgents]);

  // Tactical line updates
  useEffect(() => {
    if (!gameState?.round) return;

    try {
      const lines: string[] = [];
      if (gameState.round.phase === 'freezetime' || gameState.round.phase === 'live') {
        const tStrategy = gameState.round.currentStrategy.t;
        const ctStrategy = gameState.round.currentStrategy.ct;
        
        if (tStrategy in STRATEGY_PATHS) {
          lines.push(STRATEGY_PATHS[tStrategy].path);
        }
        if (ctStrategy in STRATEGY_PATHS) {
          lines.push(STRATEGY_PATHS[ctStrategy].path);
        }
      }
      setTacticalLines(lines);
    } catch (error) {
      console.error('Error updating tactical lines:', error);
      toast.error('Failed to update tactical lines');
    }
  }, [gameState?.round]);

  if (!gameState || !gameState.teams || !gameState.round) {
    return (
      <Card className={cn("w-full aspect-square bg-gray-900 p-4", className)}>
        <div className="flex items-center justify-center h-full text-red-500">
          Invalid game state
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full aspect-square bg-gray-900 p-4", className)}>
      <svg 
        viewBox="0 0 300 300" 
        className="w-full h-full"
        style={{ backgroundColor: '#1a1a1a' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* SVG Definitions */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Map Elements */}
        <MapLayout />

        {/* Tactical Elements */}
        {tacticalLines.map((path, index) => (
          <path
            key={`tactical-${index}`}
            d={path}
            stroke="#ffd700"
            strokeWidth="3"
            fill="none"
            opacity="0.4"
            strokeDasharray="5,5"
            className="animate-pulse"
          />
        ))}

        {/* Strategy Zones */}
        {gameState.round.phase === 'live' && (
          <>
            {Object.entries(STRATEGY_ZONES).map(([strategy, zones]) => 
              zones.map((zone, i) => (
                <circle
                  key={`${strategy}-zone-${i}`}
                  cx={zone.x}
                  cy={zone.y}
                  r={zone.radius}
                  fill={zone.color}
                  opacity="0.15"
                  className="animate-pulse"
                >
                  <title>{zone.name}</title>
                </circle>
              ))
            )}
          </>
        )}

        {/* Game Events */}
        {gameState.events.map((event, i) => (
          <EventEffect key={`event-${i}`} event={event} />
        ))}

        {/* Agents */}
        {allAgents.map((agent) => (
          <AgentDot 
            key={agent.id} 
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onClick={onAgentSelect}
          />
        ))}

        {/* HUD Elements */}
        <GameHUD gameState={gameState} />
      </svg>
    </Card>
  );
};

export default GameRenderer;