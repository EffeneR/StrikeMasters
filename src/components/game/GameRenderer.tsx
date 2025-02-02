'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

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
};

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

interface Position {
  x: number;
  y: number;
}

interface Agent {
  id: string;
  name: string;
  team: 't' | 'ct';
  isAlive: boolean;
  position: Position;
  role: string;
  weapons?: string[];
  equipment?: string[];
}

interface GameEvent {
  type: 'flash' | 'smoke' | 'fire' | 'kill' | 'utility';
  position: Position;
  subType?: string;
}

interface GameRendererProps {
  agents: Agent[];
  events: GameEvent[];
  strategy?: string;
  phase?: string;
  currentCall?: string | null;
}

const GameRenderer: React.FC<GameRendererProps> = ({ 
  agents = [], 
  events = [], 
  strategy = 'default', 
  phase = 'setup',
  currentCall = null
}) => {
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [tacticalLines, setTacticalLines] = useState<string[]>([]);

  useEffect(() => {
    const newPositions: Record<string, Position> = {};
    agents.forEach((agent) => {
      if (agent.position) {
        newPositions[agent.id] = agent.position;
      }
    });
    setPositions(newPositions);
  }, [agents]);

  useEffect(() => {
    // Update tactical lines based on strategy and phase
    const lines: string[] = [];
    if (phase === 'freezetime' || phase === 'live') {
      switch (strategy) {
        case 'rush_b':
          lines.push(MAP_PATHS.rush_b);
          break;
        case 'split_a':
          lines.push(MAP_PATHS.split_a);
          break;
        case 'mid_control':
          lines.push(MAP_PATHS.mid_control);
          break;
      }
    }
    setTacticalLines(lines);
  }, [strategy, phase]);
  
  // Subcomponents for visualization
  const AgentDot: React.FC<{ agent: Agent }> = ({ agent }) => {
    const position = positions[agent.id] || { x: 0, y: 0 };
    const color = agent.team === 't' ? '#ff4444' : '#4444ff';
    const glowColor = agent.team === 't' ? 'rgba(255,68,68,0.3)' : 'rgba(68,68,255,0.3)';
    
    return (
      <g 
        transform={`translate(${position.x}, ${position.y})`} 
        className="transition-all duration-300"
        filter="url(#glow)"
      >
        {/* Position indicator */}
        {currentCall && (
          <circle
            r="15"
            fill="none"
            stroke={glowColor}
            strokeWidth="2"
            opacity="0.5"
          />
        )}
        
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
      <rect x="190" y="50" width="50" height="50" fill="#2a2a2a" opacity="0.5" 
        className={strategy === 'split_a' || currentCall === 'rotate_a' ? 'stroke-yellow-400 stroke-2' : ''} />
      <text x="215" y="85" fill="#fff" textAnchor="middle" fontSize="14" fontWeight="bold">A</text>
      
      <rect x="50" y="200" width="50" height="50" fill="#2a2a2a" opacity="0.5"
        className={strategy === 'rush_b' || currentCall === 'rotate_b' ? 'stroke-yellow-400 stroke-2' : ''} />
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
          stroke={key.includes(strategy) ? '#ffd700' : '#444'}
          strokeWidth={key.includes(strategy) ? 4 : 3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={key.includes(strategy) ? 0.6 : 1}
        />
      ))}

      {/* Strategy visualization */}
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
        >
          <animate
            attributeName="strokeDashoffset"
            from="10"
            to="0"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      ))}
    </g>
  );

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

  const EventEffect: React.FC<{ event: GameEvent; index: number }> = ({ event, index }) => {
    switch (event.type) {
      case 'flash':
        return (
          <circle
            key={index}
            cx={event.position.x}
            cy={event.position.y}
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
      case 'smoke':
        return (
          <circle
            key={index}
            cx={event.position.x}
            cy={event.position.y}
            r="20"
            fill="#888"
            opacity="0.7"
          >
            <animate
              attributeName="r"
              values="18;20;18"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        );
      case 'fire':
        return (
          <circle
            key={index}
            cx={event.position.x}
            cy={event.position.y}
            r="15"
            fill="#f44"
            opacity="0.5"
          >
            <animate
              attributeName="r"
              values="13;15;13"
              dur="0.5s"
              repeatCount="indefinite"
            />
          </circle>
        );
      case 'utility':
        return (
          <g key={index}>
            <circle
              cx={event.position.x}
              cy={event.position.y}
              r="5"
              fill="#4ade80"
              opacity="0.8"
            >
              <animate
                attributeName="r"
                values="3;5;3"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      default:
        return null;
    }
  };

  const EventEffects: React.FC = () => (
    <g className="event-effects">
      {events
        .filter(e => e.position)
        .map((event, i) => (
          <EventEffect key={`${event.type}-${i}`} event={event} index={i} />
        ))}

      {/* Strategy-based effects */}
      {phase === 'live' && strategy !== 'default' && (
        <g className="strategy-indicators">
          {/* Strategy zones */}
          {getStrategyZones(strategy).map((zone, i) => (
            <circle
              key={`zone-${i}`}
              cx={zone.x}
              cy={zone.y}
              r={zone.radius || 20}
              fill={zone.color || "#ffd700"}
              opacity="0.15"
              className="animate-pulse"
            />
          ))}
        </g>
      )}

      {/* Current call visualization */}
      {currentCall && (
        <g className="call-indicators">
          {getCallIndicators(currentCall).map((indicator, i) => (
            <g key={`call-${i}`}>
              <path
                d={indicator.path}
                stroke="#00ff00"
                strokeWidth="2"
                fill="none"
                opacity="0.5"
                strokeDasharray="5,5"
              >
                <animate
                  attributeName="strokeDashoffset"
                  from="10"
                  to="0"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
              {indicator.point && (
                <circle
                  cx={indicator.point.x}
                  cy={indicator.point.y}
                  r="5"
                  fill="#00ff00"
                  opacity="0.5"
                  className="animate-ping"
                />
              )}
            </g>
          ))}
        </g>
      )}
    </g>
  );

  // Helper function to get strategy-specific zones
  const getStrategyZones = (strategy: string) => {
    switch (strategy) {
      case 'rush_b':
        return [
          { x: 70, y: 220, radius: 30, color: "#ff4444" },
        ];
      case 'split_a':
        return [
          { x: 85, y: 80, radius: 20, color: "#4444ff" },
          { x: 180, y: 120, radius: 20, color: "#4444ff" },
        ];
      case 'mid_control':
        return [
          { x: 150, y: 150, radius: 25, color: "#44ff44" },
        ];
      default:
        return [];
    }
  };

  // Helper function to get call-specific indicators
  const getCallIndicators = (call: string) => {
    switch (call) {
      case 'rotate_a':
        return [{
          path: "M 150,150 Q 180,120 220,80",
          point: { x: 220, y: 80 }
        }];
      case 'rotate_b':
        return [{
          path: "M 150,150 Q 100,180 70,220",
          point: { x: 70, y: 220 }
        }];
      case 'hold_positions':
        return agents
          .filter(a => a.isAlive && a.team === 't')
          .map(a => ({
            path: "",
            point: a.position
          }));
      default:
        return [];
    }
  };

  return (
    <Card className="w-full aspect-square bg-gray-900 p-4">
      <svg 
        viewBox="0 0 300 300" 
        className="w-full h-full"
        style={{ backgroundColor: '#1a1a1a' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow effect for agents */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Gradient for strategy paths */}
          <linearGradient id="strategyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#ffd700" stopOpacity="0.2"/>
          </linearGradient>
        </defs>

        {/* Map base layout */}
        <MapLayout />

        {/* Events and effects */}
        <EventEffects />

        {/* Agents */}
        {agents.map((agent) => (
          <AgentDot key={agent.id} agent={agent} />
        ))}

        {/* Strategy overlay */}
        {phase === 'freezetime' && strategy !== 'default' && (
          <g className="strategy-overlay" opacity="0.6">
            <text
              x="150"
              y="20"
              textAnchor="middle"
              fill="#ffd700"
              fontSize="14"
              className="font-bold"
            >
              {strategy.toUpperCase()} STRATEGY
            </text>
          </g>
        )}
      </svg>
    </Card>
  );
};

export default GameRenderer;