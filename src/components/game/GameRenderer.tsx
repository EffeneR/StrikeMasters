'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useGame } from '@/components/game-provider';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import type { GameState, Position, Agent, GameEvent, Team } from '@/types/game';

// Map constants
const MAP_POSITIONS = {
  // Sites
  a_site: { x: 220, y: 80 },
  b_site: { x: 70, y: 220 },
  
  // Key positions
  t_spawn: { x: 60, y: 180 },
  ct_spawn: { x: 230, y: 170 },
  mid: { x: 150, y: 150 },
  
  // A side
  long_doors: { x: 85, y: 80 },
  catwalk: { x: 180, y: 120 },
  goose: { x: 200, y: 90 },
  car: { x: 240, y: 70 },
  
  // B side
  upper_tunnels: { x: 80, y: 200 },
  lower_tunnels: { x: 100, y: 220 },
  b_platform: { x: 70, y: 220 },
  
  // Mid
  t_mid: { x: 120, y: 150 },
  window: { x: 150, y: 120 },
  mid_doors: { x: 150, y: 150 },
  xbox: { x: 130, y: 130 }
} as const;

const MAP_PATHS = {
  long_doors: "M 80,50 L 150,50",
  catwalk: "M 150,100 L 200,80",
  mid_doors: "M 120,150 L 180,150",
  tunnels: "M 80,200 L 150,200",
  
  // Strategy paths
  rush_b: "M 60,180 Q 70,190 80,200 T 70,220",
  split_a: "M 60,180 Q 85,80 180,120 M 60,180 Q 120,150 180,120",
  mid_control: "M 60,180 Q 120,150 150,150 T 180,120"
} as const;

interface GameRendererProps {
  className?: string;
  gameState: GameState;
}

const AgentDot: React.FC<{ agent: Agent }> = ({ agent }) => {
  const position = agent.position || MAP_POSITIONS[`${agent.team}_spawn`];
  const color = agent.team === 't' ? '#ff4444' : '#4444ff';
  const glowColor = agent.team === 't' ? 'rgba(255,68,68,0.3)' : 'rgba(68,68,255,0.3)';
  
  const healthColor = agent.health && agent.health > 0 
    ? `hsl(${agent.health}, 100%, 50%)`
    : '#666';
  
  return (
    <g 
      transform={`translate(${position.x}, ${position.y})`} 
      className="transition-all duration-300"
      filter="url(#glow)"
    >
      {/* Health/Armor indicator */}
      {agent.isAlive && (
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
            fill={healthColor}
            rx="1"
          />
          {agent.armor && agent.armor > 0 && (
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
      )}
      
      {/* Position indicator */}
      <circle
        r="15"
        fill="none"
        stroke={glowColor}
        strokeWidth="2"
        opacity="0.5"
      />
      
      {/* Agent dot */}
      <circle 
        r="5" 
        fill={color}
        stroke={agent.isAlive ? '#fff' : '#666'}
        strokeWidth="2"
        opacity={agent.isAlive ? 1 : 0.5}
      />

      {/* Equipment indicators */}
      {agent.isAlive && agent.equipment?.length > 0 && (
        <circle
          r="3"
          cy="-8"
          fill="#4ade80"
          opacity="0.8"
        />
      )}

      {/* Role-based indicator */}
      <circle
        r="2"
        cx="7"
        fill={getRoleColor(agent.role)}
        opacity="0.8"
      />
      
      {/* Agent name */}
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

const MapLayout: React.FC = () => (
  <g className="map-layout">
    {/* Sites with labels */}
    <rect x="190" y="50" width="50" height="50" fill="#2a2a2a" opacity="0.5" />
    <text x="215" y="85" fill="#fff" textAnchor="middle" fontSize="14" fontWeight="bold">A</text>
    
    <rect x="50" y="200" width="50" height="50" fill="#2a2a2a" opacity="0.5" />
    <text x="75" y="235" fill="#fff" textAnchor="middle" fontSize="14" fontWeight="bold">B</text>

    {/* Spawn areas */}
    <rect x="30" y="160" width="40" height="30" fill="#444" opacity="0.5" />
    <text x="50" y="180" fill="#ff4444" textAnchor="middle" fontSize="12">T</text>
    
    <rect x="220" y="160" width="40" height="30" fill="#444" opacity="0.5" />
    <text x="240" y="180" fill="#4444ff" textAnchor="middle" fontSize="12">CT</text>

    {/* Map paths */}
    {Object.entries(MAP_PATHS).map(([key, path]) => (
      <path 
        key={key} 
        d={path} 
        stroke="#444"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    ))}
  </g>
);

const EventEffect: React.FC<{ event: GameEvent }> = ({ event }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (event.timestamp) {
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
      }, event.type === 'damage' ? 15000 : 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [event]);

  if (!isVisible) return null;

  const position = event.location || { x: 0, y: 0 };

  switch (event.type) {
    case 'damage':
      return (
        <circle
          cx={position.x}
          cy={position.y}
          r="15"
          fill="#fff"
          opacity="0.5"
        >
          <animate
            attributeName="opacity"
            from="0.5"
            to="0"
            dur="0.5s"
            begin="0s"
            fill="freeze"
          />
        </circle>
      );
    case 'kill':
      return (
        <g>
          <circle
            cx={position.x}
            cy={position.y}
            r="10"
            fill="none"
            stroke="#ff0000"
            strokeWidth="2"
            opacity="0.8"
          >
            <animate
              attributeName="r"
              from="5"
              to="15"
              dur="1s"
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              from="0.8"
              to="0"
              dur="1s"
              fill="freeze"
            />
          </circle>
          <text
            x={position.x}
            y={position.y - 20}
            textAnchor="middle"
            fill="#ff0000"
            fontSize="14"
            opacity="0.8"
          >
            ☠
          </text>
        </g>
      );
    default:
      return null;
  }
};

const getRoleColor = (role: string): string => {
  switch (role) {
    case 'Entry Fragger': return '#ff4444';
    case 'AWPer': return '#4444ff';
    case 'Support': return '#44ff44';
    case 'In-Game Leader': return '#ffff44';
    case 'Lurker': return '#ff44ff';
    default: return '#ffffff';
  }
};

const getStrategyZones = (strategy: string) => {
  switch (strategy) {
    case 'rush_b':
      return [{ x: 70, y: 220, radius: 30, color: "#ff4444" }];
    case 'split_a':
      return [
        { x: 85, y: 80, radius: 20, color: "#4444ff" },
        { x: 180, y: 120, radius: 20, color: "#4444ff" }
      ];
    case 'mid_control':
      return [{ x: 150, y: 150, radius: 25, color: "#44ff44" }];
    default:
      return [];
  }
};

const GameRenderer: React.FC<GameRendererProps> = ({ className, gameState }) => {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [tacticalLines, setTacticalLines] = useState<string[]>([]);

  const allAgents = useMemo(() => {
    if (!gameState?.teams) return [];
    return [...gameState.teams.t.agents, ...gameState.teams.ct.agents];
  }, [gameState?.teams]);

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

  useEffect(() => {
    try {
      const lines: string[] = [];
      if (gameState.round.phase === 'freezetime' || gameState.round.phase === 'live') {
        const tStrategy = gameState.round.currentStrategy.t;
        const ctStrategy = gameState.round.currentStrategy.ct;
        
        if (tStrategy in MAP_PATHS) {
          lines.push(MAP_PATHS[tStrategy as keyof typeof MAP_PATHS]);
        }
        if (ctStrategy in MAP_PATHS) {
          lines.push(MAP_PATHS[ctStrategy as keyof typeof MAP_PATHS]);
        }
      }
      setTacticalLines(lines);
    } catch (error) {
      console.error('Error updating tactical lines:', error);
      toast.error('Failed to update tactical lines');
    }
  }, [gameState.round.currentStrategy, gameState.round.phase]);

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
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <MapLayout />

        {/* Tactical Lines */}
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
            {getStrategyZones(gameState.round.currentStrategy.t).map((zone, i) => (
              <circle
                key={`t-zone-${i}`}
                cx={zone.x}
                cy={zone.y}
                r={zone.radius}
                fill={zone.color}
                opacity="0.15"
                className="animate-pulse"
              />
            ))}
            {getStrategyZones(gameState.round.currentStrategy.ct).map((zone, i) => (
              <circle
                key={`ct-zone-${i}`}
                cx={zone.x}
                cy={zone.y}
                r={zone.radius}
                fill={zone.color}
                opacity="0.15"
                className="animate-pulse"
              />
            ))}
          </>
        )}

        {/* Events */}
        {gameState.events.map((event, i) => (
          <EventEffect key={`event-${i}`} event={event} />
        ))}

        {/* Agents */}
        {allAgents.map((agent) => (
          <AgentDot key={agent.id} agent={agent} />
        ))}

        {/* Round Timer */}
        {gameState.round.phase !== 'ended' && (
          <text
            x="150"
            y="40"
            textAnchor="middle"
            fill="#fff"
            fontSize="20"
            className="font-bold"
          >
            {Math.floor(gameState.round.timeLeft / 60)}:
            {(gameState.round.timeLeft % 60).toString().padStart(2, '0')}
          </text>
        )}

        {/* Strategy Labels */}
        {gameState.round.phase === 'freezetime' && (
          <>
            <text
              x="150"
              y="20"
              textAnchor="middle"
              fill="#ffd700"
              fontSize="14"
              className="font-bold"
            >
              T: {gameState.round.currentStrategy.t.toUpperCase()}
            </text>
            <text
              x="150"
              y="60"
              textAnchor="middle"
              fill="#4444ff"
              fontSize="14"
              className="font-bold"
            >
              CT: {gameState.round.currentStrategy.ct.toUpperCase()}
            </text>
          </>
        )}
      </svg>
    </Card>
  );
};

export default GameRenderer;