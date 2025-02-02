// MovementSystem.ts
import Dust2TacticsSystem from './Dust2TacticsSystem';

interface Position {
  x: number;
  y: number;
}

interface Agent {
  id: string;
  team: 't' | 'ct';
  role: string;
  position: Position;
  isAlive: boolean;
  strategyStats?: {
    positioningScore: number;
    strategyAdherence: number;
  };
}

interface MovementPath {
  points: Position[];
  currentIndex: number;
}

class MovementSystem {
  private tactics: Dust2TacticsSystem;
  private agentPaths: Map<string, MovementPath>;
  private readonly MOVEMENT_SPEED = 2;
  private readonly CLOSE_DISTANCE = 5;

  constructor(tactics: Dust2TacticsSystem) {
    this.tactics = tactics;
    this.agentPaths = new Map();
  }

  updatePositions(
    agents: Agent[],
    phase: string,
    deltaTime: number,
    strategy: string,
    currentCall: string | null
  ): void {
    agents.forEach(agent => {
      if (!agent.isAlive) return;

      let targetPosition: Position;

      // Get target position based on current situation
      if (currentCall) {
        targetPosition = this.getCallBasedPosition(agent, currentCall);
      } else {
        targetPosition = this.tactics.getPositionForAgent(agent, phase, strategy);
      }

      // Create or update path
      if (!this.agentPaths.has(agent.id)) {
        this.createPath(agent, targetPosition);
      }

      // Move agent along path
      this.moveAlongPath(agent, deltaTime);

      // Update strategy stats
      this.updatePositioningStats(agent, targetPosition);
    });
  }

  private createPath(agent: Agent, targetPosition: Position): void {
    const path = this.calculatePath(agent.position, targetPosition);
    this.agentPaths.set(agent.id, {
      points: path,
      currentIndex: 0
    });
  }

  private calculatePath(start: Position, end: Position): Position[] {
    // Basic path calculation - can be enhanced with pathfinding
    const path: Position[] = [];
    const steps = 10; // Number of intermediate points

    for (let i = 0; i <= steps; i++) {
      path.push({
        x: start.x + (end.x - start.x) * (i / steps),
        y: start.y + (end.y - start.y) * (i / steps)
      });
    }

    return path;
  }

  private moveAlongPath(agent: Agent, deltaTime: number): void {
    const path = this.agentPaths.get(agent.id);
    if (!path) return;

    const targetPoint = path.points[path.currentIndex];
    const distance = this.calculateDistance(agent.position, targetPoint);

    if (distance <= this.CLOSE_DISTANCE) {
      // Move to next point in path
      if (path.currentIndex < path.points.length - 1) {
        path.currentIndex++;
        return;
      }
    }

    // Move towards current target point
    const direction = this.getNormalizedDirection(agent.position, targetPoint);
    const movement = this.MOVEMENT_SPEED * deltaTime;

    agent.position = {
      x: agent.position.x + direction.x * movement,
      y: agent.position.y + direction.y * movement
    };
  }

  private getCallBasedPosition(agent: Agent, call: string): Position {
    // Get positions based on mid-round calls
    switch (call) {
      case 'rotate_a':
        return this.tactics.getPositionForRotate(agent, 'A');
      case 'rotate_b':
        return this.tactics.getPositionForRotate(agent, 'B');
      case 'execute_a':
        return this.tactics.getPositionForExecute(agent, 'A');
      case 'execute_b':
        return this.tactics.getPositionForExecute(agent, 'B');
      case 'fall_back':
        return this.tactics.getPositionForFallback(agent);
      case 'hold_positions':
        return agent.position; // Stay in current position
      default:
        return this.tactics.getDefaultPosition(agent);
    }
  }

  private updatePositioningStats(agent: Agent, targetPosition: Position): void {
    if (!agent.strategyStats) return;

    const distance = this.calculateDistance(agent.position, targetPosition);
    const maxAllowedDistance = 50; // Maximum distance for positioning score calculation

    // Update positioning score (0-1 range)
    agent.strategyStats.positioningScore = Math.max(
      0,
      1 - (distance / maxAllowedDistance)
    );

    // Update strategy adherence based on positioning
    agent.strategyStats.strategyAdherence = 
      (agent.strategyStats.strategyAdherence + agent.strategyStats.positioningScore) / 2;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getNormalizedDirection(from: Position, to: Position): Position {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return { x: 0, y: 0 };

    return {
      x: dx / length,
      y: dy / length
    };
  }

  // Utility methods for strategy-based movement
  private shouldHoldPosition(agent: Agent, strategy: string): boolean {
    return (
      strategy === 'default' ||
      (agent.role === 'AWPer' && strategy === 'hold_positions')
    );
  }

  private getStrategicMoveSpeed(agent: Agent, strategy: string): number {
    switch (strategy) {
      case 'rush_b':
        return this.MOVEMENT_SPEED * 1.5;
      case 'eco_rush':
        return this.MOVEMENT_SPEED * 1.3;
      case 'default':
        return this.MOVEMENT_SPEED;
      default:
        return this.MOVEMENT_SPEED;
    }
  }

  // Reset path for an agent (useful when strategy changes)
  resetPath(agentId: string): void {
    this.agentPaths.delete(agentId);
  }

  // Reset all paths (useful when round ends or new strategy is called)
  resetAllPaths(): void {
    this.agentPaths.clear();
  }
}

export default MovementSystem;