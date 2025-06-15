import { NextResponse } from 'next/server';

// Types for different sports data
interface PlayerStats {
  id: string;
  name: string;
  team: string;
  stats: Record<string, number>;
}

interface TeamStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  stats: Record<string, number>;
}

// Mock data for demonstration
const mockPlayerStats: Record<string, PlayerStats> = {
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
    },
  },
  // Add more players as needed
};

const mockTeamStats: Record<string, TeamStats> = {
  'lakers': {
    id: 'lakers',
    name: 'Los Angeles Lakers',
    wins: 42,
    losses: 30,
    stats: {
      pointsPerGame: 117.2,
      reboundsPerGame: 43.1,
      assistsPerGame: 28.3,
    },
  },
  // Add more teams as needed
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  try {
    switch (type) {
      case 'player':
        if (!id) {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }
        const playerStats = mockPlayerStats[id];
        if (!playerStats) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }
        return NextResponse.json(playerStats);

      case 'team':
        if (!id) {
          return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
        }
        const teamStats = mockTeamStats[id];
        if (!teamStats) {
          return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        return NextResponse.json(teamStats);

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching sports data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 