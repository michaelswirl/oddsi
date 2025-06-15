// Types
export interface PlayerStats {
  id: string;
  name: string;
  team: string;
  stats: Record<string, number>;
}

export interface TeamStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  stats: Record<string, number>;
}

// Utility functions for player stats
export function calculatePlayerEfficiency(stats: PlayerStats): number {
  const { stats: playerStats } = stats;
  // Basic PER calculation (simplified)
  return (
    playerStats.points +
    playerStats.rebounds * 0.7 +
    playerStats.assists * 0.7 +
    playerStats.steals * 1.5 +
    playerStats.blocks * 1.5
  );
}

export function calculatePlayerValue(stats: PlayerStats): number {
  const { stats: playerStats } = stats;
  // Calculate player value based on various stats
  return (
    playerStats.points * 1.0 +
    playerStats.rebounds * 1.2 +
    playerStats.assists * 1.5 +
    playerStats.steals * 2.0 +
    playerStats.blocks * 2.0
  );
}

// Utility functions for team stats
export function calculateTeamWinPercentage(stats: TeamStats): number {
  const { wins, losses } = stats;
  return wins / (wins + losses);
}

export function calculateTeamStrength(stats: TeamStats): number {
  const { stats: teamStats } = stats;
  // Calculate team strength based on various stats
  return (
    teamStats.pointsPerGame * 1.0 +
    teamStats.reboundsPerGame * 0.8 +
    teamStats.assistsPerGame * 1.2
  );
}

// Comparison functions
export function comparePlayers(player1: PlayerStats, player2: PlayerStats): {
  betterPlayer: string;
  difference: number;
} {
  const value1 = calculatePlayerValue(player1);
  const value2 = calculatePlayerValue(player2);
  
  return {
    betterPlayer: value1 > value2 ? player1.name : player2.name,
    difference: Math.abs(value1 - value2),
  };
}

export function compareTeams(team1: TeamStats, team2: TeamStats): {
  betterTeam: string;
  difference: number;
} {
  const strength1 = calculateTeamStrength(team1);
  const strength2 = calculateTeamStrength(team2);
  
  return {
    betterTeam: strength1 > strength2 ? team1.name : team2.name,
    difference: Math.abs(strength1 - strength2),
  };
}

// Formatting functions
export function formatPlayerStats(stats: PlayerStats): string {
  return `${stats.name} (${stats.team}):
Points: ${stats.stats.points}
Rebounds: ${stats.stats.rebounds}
Assists: ${stats.stats.assists}
Steals: ${stats.stats.steals}
Blocks: ${stats.stats.blocks}`;
}

export function formatTeamStats(stats: TeamStats): string {
  return `${stats.name}:
Record: ${stats.wins}-${stats.losses}
Points per game: ${stats.stats.pointsPerGame}
Rebounds per game: ${stats.stats.reboundsPerGame}
Assists per game: ${stats.stats.assistsPerGame}`;
} 