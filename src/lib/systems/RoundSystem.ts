// RoundSystem.ts
interface RoundState {
  phase: 'warmup' | 'freezetime' | 'live' | 'planted' | 'ended';
  timeLeft: number;
  bombPlanted: boolean;
  bombSite: 'A' | 'B' | null;
  plantTime: number | null;
  winner: 't' | 'ct' | null;
  endReason: string | null;
  currentStrategy: {
    t: string;
    ct: string;
  };
  activeCall: string | null;
}

interface StrategyOutcome {
  strategy: string;
  success: boolean;
  kills: number;
  objectives: boolean;
  roundTime: number;
}

class RoundSystem {
  private readonly ROUND_TIME = 115;
  private readonly FREEZE_TIME = 15;
  private readonly WARMUP_TIME = 5;
  private readonly BOMB_TIMER = 40;
  private readonly POST_ROUND_TIME = 7;

  private roundHistory: {
    winner: 't' | 'ct';
    strategies: {
      t: StrategyOutcome;
      ct: StrategyOutcome;
    };
    endReason: string;
  }[] = [];

  initializeRound(): RoundState {
    return {
      phase: 'warmup',
      timeLeft: this.WARMUP_TIME,
      bombPlanted: false,
      bombSite: null,
      plantTime: null,
      winner: null,
      endReason: null,
      currentStrategy: {
        t: 'default',
        ct: 'default'
      },
      activeCall: null
    };
  }

  updateTimer(state: RoundState): RoundState {
    if (state.timeLeft <= 0) {
      switch (state.phase) {
        case 'warmup':
          return {
            ...state,
            phase: 'freezetime',
            timeLeft: this.FREEZE_TIME
          };
        case 'freezetime':
          return {
            ...state,
            phase: 'live',
            timeLeft: this.ROUND_TIME
          };
        case 'live':
          if (!state.bombPlanted) {
            return this.endRound(state, 'ct', 'Time ran out');
          }
          return state;
        case 'planted':
          return this.endRound(state, 't', 'Bomb detonated');
        case 'ended':
          return state;
      }
    }

    if (state.bombPlanted && state.plantTime) {
      const bombTimeLeft = this.BOMB_TIMER - ((Date.now() - state.plantTime) / 1000);
      if (bombTimeLeft <= 0) {
        return this.endRound(state, 't', 'Bomb detonated');
      }
    }

    return {
      ...state,
      timeLeft: Math.max(0, state.timeLeft - 1)
    };
  }

  plantBomb(state: RoundState, site: 'A' | 'B'): RoundState {
    if (state.phase !== 'live' || state.bombPlanted) return state;

    return {
      ...state,
      phase: 'planted',
      bombPlanted: true,
      bombSite: site,
      plantTime: Date.now(),
      timeLeft: this.BOMB_TIMER
    };
  }

  defuseBomb(state: RoundState): RoundState {
    if (!state.bombPlanted) return state;
    return this.endRound(state, 'ct', 'Bomb defused');
  }

  endRound(state: RoundState, winner: 't' | 'ct', reason: string): RoundState {
    // Record strategy outcomes
    const tStrategy = state.currentStrategy.t;
    const ctStrategy = state.currentStrategy.ct;

    this.roundHistory.push({
      winner,
      strategies: {
        t: {
          strategy: tStrategy,
          success: winner === 't',
          kills: 0, // These would be updated from combat system
          objectives: state.bombPlanted,
          roundTime: this.ROUND_TIME - state.timeLeft
        },
        ct: {
          strategy: ctStrategy,
          success: winner === 'ct',
          kills: 0,
          objectives: winner === 'ct' && state.bombPlanted,
          roundTime: this.ROUND_TIME - state.timeLeft
        }
      },
      endReason: reason
    });

    return {
      ...state,
      phase: 'ended',
      timeLeft: this.POST_ROUND_TIME,
      winner,
      endReason: reason
    };
  }

  evaluateStrategySuccess(
    state: RoundState,
    tKills: number,
    ctKills: number
  ): void {
    const currentRound = this.roundHistory[this.roundHistory.length - 1];
    if (!currentRound) return;

    currentRound.strategies.t.kills = tKills;
    currentRound.strategies.ct.kills = ctKills;
  }

  getStrategyStats(team: 't' | 'ct', strategy: string): {
    totalRounds: number;
    wins: number;
    avgKills: number;
    avgTime: number;
    objectiveSuccess: number;
  } {
    const relevantRounds = this.roundHistory.filter(
      round => round.strategies[team].strategy === strategy
    );

    const wins = relevantRounds.filter(round => round.winner === team).length;
    const totalKills = relevantRounds.reduce(
      (sum, round) => sum + round.strategies[team].kills, 
      0
    );
    const totalTime = relevantRounds.reduce(
      (sum, round) => sum + round.strategies[team].roundTime, 
      0
    );
    const objectiveSuccess = relevantRounds.filter(
      round => round.strategies[team].objectives
    ).length;

    const totalRounds = relevantRounds.length;
    if (totalRounds === 0) {
      return {
        totalRounds: 0,
        wins: 0,
        avgKills: 0,
        avgTime: 0,
        objectiveSuccess: 0
      };
    }

    return {
      totalRounds,
      wins,
      avgKills: totalKills / totalRounds,
      avgTime: totalTime / totalRounds,
      objectiveSuccess: objectiveSuccess / totalRounds
    };
  }

  getRoundHistory(): typeof this.roundHistory {
    return this.roundHistory;
  }

  getLastRoundOutcome(): typeof this.roundHistory[0] | null {
    return this.roundHistory[this.roundHistory.length - 1] || null;
  }

  resetHistory(): void {
    this.roundHistory = [];
  }
}

export default RoundSystem;