import { NextResponse } from 'next/server';
import type { PlayerStats, TeamStats } from '@/lib/sports-utils';
import { 
  calculatePlayerEfficiency,
  calculatePlayerValue,
  calculateTeamWinPercentage,
  calculateTeamStrength,
  comparePlayers,
  compareTeams
} from '@/lib/sports-utils';

// Mock NBA data
const nbaPlayers: Record<string, PlayerStats> = {
  'lebron-james': {
    id: 'lebron-james',
    name: 'LeBron James',
    team: 'LAL',
    stats: {
      points: 25.7,
      rebounds: 7.3,
      assists: 8.1,
      steals: 1.1,
      blocks: 0.6,
      fieldGoalPercentage: 50.5,
      threePointPercentage: 41.0,
      freeThrowPercentage: 75.0,
      minutesPerGame: 35.5,
    },
  },
  'stephen-curry': {
    id: 'stephen-curry',
    name: 'Stephen Curry',
    team: 'GSW',
    stats: {
      points: 29.4,
      rebounds: 6.1,
      assists: 6.3,
      steals: 0.9,
      blocks: 0.4,
      fieldGoalPercentage: 49.3,
      threePointPercentage: 42.7,
      freeThrowPercentage: 91.5,
      minutesPerGame: 34.7,
    },
  },
};

const nbaTeams: Record<string, TeamStats> = {
  'lakers': {
    id: 'lakers',
    name: 'Los Angeles Lakers',
    wins: 42,
    losses: 30,
    stats: {
      pointsPerGame: 117.2,
      reboundsPerGame: 43.1,
      assistsPerGame: 28.3,
      fieldGoalPercentage: 48.5,
      threePointPercentage: 36.8,
      freeThrowPercentage: 78.2,
      pointsAllowed: 113.8,
    },
  },
  'warriors': {
    id: 'warriors',
    name: 'Golden State Warriors',
    wins: 44,
    losses: 28,
    stats: {
      pointsPerGame: 118.9,
      reboundsPerGame: 44.2,
      assistsPerGame: 29.8,
      fieldGoalPercentage: 47.8,
      threePointPercentage: 38.5,
      freeThrowPercentage: 80.1,
      pointsAllowed: 115.2,
    },
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const comparison = searchParams.get('comparison');

  try {
    switch (type) {
      case 'player':
        if (!id) {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }

        if (comparison) {
          const player1 = nbaPlayers[id];
          const player2 = nbaPlayers[comparison];
          
          if (!player1 || !player2) {
            return NextResponse.json({ error: 'One or both players not found' }, { status: 404 });
          }

          const comparisonResult = comparePlayers(player1, player2);
          return NextResponse.json({
            player1: {
              ...player1,
              efficiency: calculatePlayerEfficiency(player1),
              value: calculatePlayerValue(player1),
            },
            player2: {
              ...player2,
              efficiency: calculatePlayerEfficiency(player2),
              value: calculatePlayerValue(player2),
            },
            comparison: comparisonResult,
          });
        }

        const playerStats = nbaPlayers[id];
        if (!playerStats) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        return NextResponse.json({
          ...playerStats,
          efficiency: calculatePlayerEfficiency(playerStats),
          value: calculatePlayerValue(playerStats),
        });

      case 'team':
        if (!id) {
          return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
        }

        if (comparison) {
          const team1 = nbaTeams[id];
          const team2 = nbaTeams[comparison];
          
          if (!team1 || !team2) {
            return NextResponse.json({ error: 'One or both teams not found' }, { status: 404 });
          }

          const comparisonResult = compareTeams(team1, team2);
          return NextResponse.json({
            team1: {
              ...team1,
              winPercentage: calculateTeamWinPercentage(team1),
              strength: calculateTeamStrength(team1),
            },
            team2: {
              ...team2,
              winPercentage: calculateTeamWinPercentage(team2),
              strength: calculateTeamStrength(team2),
            },
            comparison: comparisonResult,
          });
        }

        const teamStats = nbaTeams[id];
        if (!teamStats) {
          return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        return NextResponse.json({
          ...teamStats,
          winPercentage: calculateTeamWinPercentage(teamStats),
          strength: calculateTeamStrength(teamStats),
        });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching NBA data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 